import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE = "https://ai.gateway.lovable.dev/v1/audio/transcriptions";

// Chunk transcript into 4-6 second caption segments by punctuation/word groups.
function splitToCaptions(text: string, durationMs: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const perCap = 10; // ~10 words per caption
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += perCap) groups.push(words.slice(i, i + perCap).join(" "));
  const step = durationMs / groups.length;
  return groups.map((t, i) => ({
    idx: i,
    start_ms: Math.round(i * step),
    end_ms: Math.round(Math.min((i + 1) * step, durationMs)),
    text: t,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { project_id } = await req.json();
    if (!project_id) return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: proj, error: pErr } = await supabase.from("projects").select("*").eq("id", project_id).maybeSingle();
    if (pErr || !proj) throw new Error("Project not found");

    await supabase.from("projects").update({ status: "transcribing", error_message: null }).eq("id", project_id);
    await supabase.from("captions").delete().eq("project_id", project_id);

    // Download the video file
    const { data: fileData, error: dlErr } = await supabase.storage.from("videos").download(proj.video_path);
    if (dlErr || !fileData) throw new Error("Failed to download video");

    // Detect duration via HTMLMediaElement isn't available; approximate by file size later, use fixed default 60s if unknown.
    // We'll try to infer duration by asking the transcription model with segment timestamps if supported;
    // for now, we send the whole file and split evenly across returned text.

    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    const ext = proj.video_path.split(".").pop() || "mp4";
    form.append("file", new File([fileData], `audio.${ext}`, { type: fileData.type || "video/mp4" }));

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
