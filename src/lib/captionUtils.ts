export type Caption = { idx: number; start_ms: number; end_ms: number; text: string };

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const fmt = (ms: number, sep = ",") => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const mss = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(mss, 3)}`;
};

export const toSRT = (caps: Caption[]) =>
  caps.map((c, i) => `${i + 1}\n${fmt(c.start_ms)} --> ${fmt(c.end_ms)}\n${c.text.trim()}\n`).join("\n");

export const toVTT = (caps: Caption[]) =>
  `WEBVTT\n\n${caps.map((c) => `${fmt(c.start_ms, ".")} --> ${fmt(c.end_ms, ".")}\n${c.text.trim()}\n`).join("\n")}`;

export const toTXT = (caps: Caption[]) => caps.map((c) => c.text.trim()).join(" ");

export const download = (content: string, filename: string, mime = "text/plain") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

/* ---------------------------------------------------------------
   Robust caption generation — calls the transcribe-video function
   directly so we can surface the real server error, keep a long
   timeout for big videos, and fall back to polling the captions
   table if the connection drops while the job finishes server-side.
----------------------------------------------------------------*/
import { supabase } from "@/integrations/supabase/client";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-video`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const fetchCaptions = async (projectId: string): Promise<Caption[]> => {
  const { data } = await supabase.from("captions").select("*").eq("project_id", projectId).order("idx");
  return (data as any) || [];
};

export const generateCaptions = async (projectId: string, language = "auto"): Promise<Caption[]> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Session expired — please log in again");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8 * 60 * 1000);
  try {
    const res = await fetch(FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ project_id: projectId, language }),
      signal: ctrl.signal,
    });
    const txt = await res.text();
    let json: any = {};
    try { json = txt ? JSON.parse(txt) : {}; } catch { /* non-json */ }
    if (!res.ok) throw new Error(json.error || txt.slice(0, 200) || `Server error ${res.status}`);
  } catch (e: any) {
    // network drop / abort — the job may still have completed server-side
    const caps = await fetchCaptions(projectId);
    if (caps.length) return caps;
    if (e?.name === "AbortError") throw new Error("Timed out — video too long, try a shorter clip");
    throw new Error(e?.message || "Caption generation failed");
  } finally {
    clearTimeout(timer);
  }

  const caps = await fetchCaptions(projectId);
  if (!caps.length) throw new Error("No speech detected in this video");
  return caps;
};
