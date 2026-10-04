import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";

// Split a segment's text into ~5-word caption chunks, distributing time proportionally by word count
function chunkSegment(text: string, startMs: number, endMs: number, perCap = 5) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += perCap) groups.push(words.slice(i, i + perCap).join(" "));
  const dur = endMs - startMs;
  return groups.map((t, i) => {
    const wStart = i * perCap;
    const wEnd = Math.min((i + 1) * perCap, words.length);
    return {
      text: t,
      start_ms: Math.round(startMs + (wStart / words.length) * dur),
      end_ms: Math.round(startMs + (wEnd / words.length) * dur),
    };
  });
}

// Fallback: chunk full transcript over an estimated duration
function splitToCaptions(text: string, durationMs: number) {
  const caps = chunkSegment(text, 0, durationMs, 5);
  return caps.map((c, i) => ({ idx: i, ...c }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { project_id, language: reqLang } = await req.json();
    if (!project_id) return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: proj, error: pErr } = await supabase.from("projects").select("*").eq("id", project_id).maybeSingle();
    if (pErr || !proj) throw new Error("Project not found");

    const language = reqLang || proj.language || "auto";
    await supabase.from("projects").update({ status: "transcribing", error_message: null, language }).eq("id", project_id);
    await supabase.from("captions").delete().eq("project_id", project_id);

    // Prefer the compact extracted audio (uploaded by the client), fall back to the video
    let fileData: Blob | null = null; let fname = "audio.wav"; let ftype = "audio/wav";
    const aud = await supabase.storage.from("videos").download(`${proj.video_path}.audio.wav`);
    if (!aud.error && aud.data) fileData = aud.data;
    else {
      const { data: vd, error: dlErr } = await supabase.storage.from("videos").download(proj.video_path);
      if (dlErr || !vd) throw new Error("Failed to download video");
      if (vd.size > 25 * 1024 * 1024) throw new Error("Video audio too large — please re-upload the video so audio can be extracted");
      fileData = vd; fname = `audio.${proj.video_path.split(".").pop() || "mp4"}`; ftype = vd.type || "video/mp4";
    }

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new File([fileData], fname, { type: ftype }));

    const SONG = " Audio may be a song with background music — transcribe the sung lyrics word by word, including repeated lines.";
    if (language === "en") {
      form.append("language", "en");
      form.append("prompt", "Transcribe spoken or sung English accurately with punctuation." + SONG);
    } else if (language === "hinglish") {
      form.append("language", "hi");
      form.append("prompt", "Yeh Hinglish hai — Hindi aur English mixed. Roman/Latin script mein likho, Urdu ya Arabic script bilkul mat use karo. Example: 'aaj main market gaya tha'. Never use Urdu." + SONG);
    } else if (language === "multi") {
      form.append("prompt", "Transcribe multilingual speech in the original language. If Hindi, use Devanagari only, never Urdu script." + SONG);
    } else {
      form.append("language", "hi");
      form.append("prompt", "हिंदी भाषा को देवनागरी लिपि में लिखें। उर्दू लिपि का उपयोग न करें। This is Hindi, not Urdu — Devanagari only." + SONG);
    }

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch(LOVABLE, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}` },
      body: form,
    });
    if (!res.ok) {
      const errTxt = await res.text().catch(() => "");
      throw new Error(`Transcription failed: ${res.status} ${errTxt.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data.text || "";
    if (!text) throw new Error("Empty transcript");

    // Estimate duration: 150 words/minute average speaking rate
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const durationMs = proj.duration_sec ? proj.duration_sec * 1000 : Math.max(30_000, Math.round((wordCount / 150) * 60_000));

    const caps = splitToCaptions(text, durationMs);
    if (caps.length) {
      await supabase.from("captions").insert(caps.map(c => ({ ...c, project_id })));
    }

    await supabase.from("projects").update({
      status: "ready",
      transcript_text: text,
      duration_sec: Math.round(durationMs / 1000),
    }).eq("id", project_id);

    return new Response(JSON.stringify({ ok: true, count: caps.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("transcribe error:", e);
    const body = await req.clone().json().catch(() => ({}));
    if (body.project_id) {
      await supabase.from("projects").update({ status: "failed", error_message: e.message?.slice(0, 500) || "Unknown" }).eq("id", body.project_id);
    }
    return new Response(JSON.stringify({ error: e.message || "failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
