import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const BodySchema = z.object({
  project_id: z.string().uuid(),
  asset_id: z.string().uuid().optional(),
  language: z.enum(["auto", "hi", "en", "hinglish", "multi"]).optional(),
});

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

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "POST required" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response({ error: "Transcription configuration missing" }, 500);
  const supabase = createClient(url, serviceKey);
  let projectId: string | undefined;
  let ownsProject = false;
  let errorStatus = 500;
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return response({ error: "Please sign in" }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return response({ error: "Session expired — please sign in again" }, 401);
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return response({ error: "Valid project_id, asset_id and caption language required" }, 400);
    const { project_id, language: reqLang, asset_id } = parsed.data;
    projectId = project_id;
    const { data: proj, error: pErr } = await supabase.from("projects").select("*").eq("id", project_id).eq("user_id", user.id).maybeSingle();
    if (pErr || !proj) return response({ error: "Project not found" }, 404);
    ownsProject = true;
    let path = proj.video_path;
    let sourceDuration = proj.duration_sec;
    if (asset_id) {
      const { data: asset } = await supabase.from("project_assets").select("storage_path,duration_sec,kind")
        .eq("id", asset_id).eq("project_id", project_id).eq("user_id", user.id).maybeSingle();
      if (!asset || !["audio", "video"].includes(asset.kind)) return response({ error: "Audio or video source not found" }, 400);
      path = asset.storage_path; sourceDuration = asset.duration_sec;
    }
    if (!path || !/\.(mp4|mov|webm|avi|mkv|mp3|wav|m4a|aac|ogg|flac)$/i.test(path)) {
      return response({ error: "Choose an audio or video file" }, 400);
    }
    const language = reqLang || proj.language || "auto";
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) return response({ error: "Audio transcription is not configured" }, 401);

    // Provider access denials are persisted across invocations/reloads. Do not replay blocked work.
    const { data: denied } = await supabase.from("projects").select("error_message")
      .like("error_message", "Provider access denied:%").limit(1).maybeSingle();
    if (denied) return response({ error: denied.error_message }, 403);

    await supabase.from("projects").update({ status: "transcribing", error_message: null, language }).eq("id", project_id);
    let fileData: Blob | null = null;
    let fname = "audio.wav";
    let ftype = "audio/wav";
    const aud = await supabase.storage.from("videos").download(`${path}.audio.wav`);
    if (!aud.error && aud.data) fileData = aud.data;
    else {
      const { data: vd, error: dlErr } = await supabase.storage.from("videos").download(path);
      if (dlErr || !vd) throw new Error("Could not download the audio source");
      fileData = vd; fname = `audio.${path.split(".").pop()}`;
      const extension = path.split(".").pop()?.toLowerCase();
      const mimes: Record<string, string> = { mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", flac: "audio/flac", mp4: "video/mp4", webm: "video/webm" };
      ftype = vd.type || mimes[extension || ""] || "application/octet-stream";
    }
    if (!fileData.size || fileData.size > 24 * 1024 * 1024) {
      errorStatus = 400;
      throw new Error("Audio transcription needs a file under 24 MB. Upload a smaller MP3 or WAV; 500 MB media uploads remain supported for editing.");
    }
    const form = new FormData();
    form.append("model", "openai/gpt-4o-mini-transcribe");
    form.append("file", new File([fileData], fname, { type: ftype }));
    // Preserve the existing buffered transcription contract and model selection.
    const SONG = " Audio may be a song with background music — transcribe the sung lyrics, including repeated lines.";
    if (language === "en") {
      form.append("language", "en"); form.append("prompt", "Transcribe spoken or sung English accurately with punctuation." + SONG);
    } else if (language === "hinglish") {
      form.append("language", "hi"); form.append("prompt", "Hindi and English mixed. Write Hindi in Roman/Latin script, never Urdu or Arabic script. Example: aaj main market gaya tha." + SONG);
    } else if (language === "hi") {
      form.append("language", "hi"); form.append("prompt", "हिंदी भाषा को देवनागरी लिपि में लिखें। उर्दू लिपि का उपयोग न करें।" + SONG);
    } else {
      form.append("prompt", "Transcribe in the original language. For Hindi use Devanagari, never Urdu script." + SONG);
    }
    const res = await fetch(LOVABLE, { method: "POST", headers: { Authorization: `Bearer ${LOVABLE_KEY}` }, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      errorStatus = res.status;
      const reason = data.message || (typeof data.error === "string" ? data.error : data.error?.message) || `Transcription failed (${res.status})`;
      const type = data.type || data.error?.type || "";
      const workspaceTypes = ["credit_limit_reached", "ai_disabled", "model_vendor_not_enabled", "model_requires_retention_consent", "provider_not_available_in_region"];
      const providerDenied = res.status === 403 && !workspaceTypes.includes(type) && !/credit|workspace|limit|disabled/i.test(reason);
      throw new Error(providerDenied ? `Provider access denied: ${reason}` : reason);
    }
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text) {
      errorStatus = 422;
      throw new Error("No transcript returned. The request has stopped; no captions were changed.");
    }
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const durationMs = sourceDuration ? sourceDuration * 1000 : Math.max(30_000, Math.round((wordCount / 150) * 60_000));
    const caps = splitToCaptions(text, durationMs);
    // Leave the previous successful transcript intact until a replacement exists.
    const { error: deleteError } = await supabase.from("captions").delete().eq("project_id", project_id);
    if (deleteError) throw deleteError;
    const { error: insertError } = await supabase.from("captions").insert(caps.map(c => ({ ...c, project_id })));
    if (insertError) throw insertError;
    const { error: updateError } = await supabase.from("projects").update({ status: "ready", transcript_text: text,
      ...(asset_id ? {} : { duration_sec: Math.round(durationMs / 1000) }), error_message: null }).eq("id", project_id);
    if (updateError) throw updateError;
    return response({ ok: true, count: caps.length, timing: "estimated" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Audio transcription failed";
    if (projectId && ownsProject) await supabase.from("projects").update({ status: "failed", error_message: message.slice(0, 500) }).eq("id", projectId);
    return response({ error: message }, errorStatus);
  }
});
