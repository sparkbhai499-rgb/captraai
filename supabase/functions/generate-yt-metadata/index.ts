import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { project_id } = await req.json();
    if (!project_id) throw new Error("project_id required");

    const { data: proj } = await supabase.from("projects").select("*").eq("id", project_id).maybeSingle();
    if (!proj) throw new Error("Project not found");

    const transcript = (proj.transcript_text || "").slice(0, 8000);
    if (!transcript) throw new Error("No transcript. Run transcription first.");

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Based on the following video transcript, generate SEO-optimized YouTube metadata.

TRANSCRIPT:
"""
${transcript}
"""

Return ONLY valid JSON matching this schema:
{
  "title": "catchy 60-70 char YouTube title",
  "description": "3-paragraph description with hook, summary, and CTA (~500 chars)",
  "hashtags": ["6-10 relevant hashtags without # symbol"],
  "keywords": ["10-15 SEO keywords"],
  "tags": ["8-12 YouTube video tags"],
  "tone": "one word: educational | entertaining | tutorial | vlog | promotional"
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a YouTube SEO expert. Output only valid JSON, no markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`AI failed: ${res.status}`);
    const raw = await res.json();
    let content: string = raw.choices?.[0]?.message?.content || "{}";
    content = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    const meta = JSON.parse(content);

    await supabase.from("yt_metadata").upsert({
      project_id,
      title: meta.title,
      description: meta.description,
      hashtags: meta.hashtags || [],
      keywords: meta.keywords || [],
      tags: meta.tags || [],
      tone: meta.tone,
    }, { onConflict: "project_id" });

    return new Response(JSON.stringify(meta), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("yt gen error:", e);
    return new Response(JSON.stringify({ error: e.message || "failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
