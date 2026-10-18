import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Caption, download, fetchCaptions, generateCaptions, toSRT, toTXT, toVTT } from "@/lib/captionUtils";
import { mediaKind } from "@/lib/media";
import { useStudio } from "@/lib/studio/store";
import { defaultText, makeClip } from "@/lib/studio/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Loader2, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";

type Source = { id: string; name: string; kind: string };

export const AudioTranscript = ({ projectId, assets }: { projectId: string; assets: Source[] }) => {
  const { setDoc, setTime } = useStudio();
  const [source, setSource] = useState("project");
  const [language, setLanguage] = useState("auto");
  const [title, setTitle] = useState("Transcript");
  const [mainKind, setMainKind] = useState("");
  const [caps, setCaps] = useState<Caption[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const applyLayers = (rows: Caption[], onlyIfEmpty = false) => {
    setDoc((doc) => {
      if (onlyIfEmpty && doc.tracks.some(t => t.clips.some(c => c.name === "Caption"))) return doc;
      const clips = rows.map(c => makeClip({
        kind: "text", name: "Caption", start: c.start_ms / 1000,
        duration: Math.max(0.04, (c.end_ms - c.start_ms) / 1000),
        text: { ...defaultText(), content: c.text, size: 56, animation: "word", strokeWidth: 3, shadow: 0.8 },
        transform: { ...makeClip({ kind: "text", name: "Caption" }).transform, y: 32 },
      }));
      return { ...doc, tracks: doc.tracks.map(t => t.kind === "text"
        ? { ...t, clips: [...t.clips.filter(c => c.name !== "Caption"), ...clips] } : t) };
    });
  };

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      const { data } = await supabase.from("projects").select("title,video_path,language,status,error_message").eq("id", projectId).single();
      if (stopped || !data) return;
      setTitle(data.title);
      setMainKind(data.video_path ? mediaKind(data.video_path) : "");
      setLanguage(data.language || "auto");
      setBusy(data.status === "transcribing");
      setError(data.status === "failed" ? data.error_message : null);
      if (data.status === "transcribing") {
        timer = setTimeout(() => void load(), 3000);
      } else {
        const rows = await fetchCaptions(projectId);
        if (stopped) return;
        setCaps(rows);
        if (rows.length) applyLayers(rows, true);
      }
    };
    void load();
    return () => { stopped = true; clearTimeout(timer); };
    // Load the persisted result once; poll only an upload already being transcribed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const generate = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const rows = await generateCaptions(projectId, language, source === "project" ? undefined : source);
      setCaps(rows); setDirty(false); applyLayers(rows);
      toast.success("Audio text and captions ready");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Transcription failed";
      setError(message); toast.error(message);
    } finally { setBusy(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const c of caps) {
        const { error } = await supabase.from("captions").update({ text: c.text }).eq("project_id", projectId).eq("idx", c.idx);
        if (error) throw error;
      }
      const { error } = await supabase.from("projects").update({ transcript_text: toTXT(caps) }).eq("id", projectId);
      if (error) throw error;
      setDirty(false); applyLayers(caps); toast.success("Transcript saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save transcript"); }
    finally { setSaving(false); }
  };

  const exportText = (format: "txt" | "srt" | "vtt") => {
    const base = title.replace(/[^a-z0-9]+/gi, "_") || "transcript";
    download(format === "txt" ? toTXT(caps) : format === "srt" ? toSRT(caps) : toVTT(caps), `${base}.${format}`,
      format === "srt" ? "application/x-subrip" : format === "vtt" ? "text/vtt" : "text/plain");
  };
  const sources = assets.filter(a => a.kind === "audio" || a.kind === "video");
  const mainAllowed = mainKind === "audio" || mainKind === "video";

  return <div className="space-y-3">
    <h3 className="font-display font-semibold text-sm">Audio to text</h3>
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">Audio / video source</label>
      <Select value={source} onValueChange={setSource} disabled={busy}>
        <SelectTrigger className="h-9 bg-secondary/50"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="project" disabled={!mainAllowed}>{title}</SelectItem>
          {sources.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <Select value={language} onValueChange={setLanguage} disabled={busy}>
      <SelectTrigger aria-label="Transcript language" className="h-9 bg-secondary/50"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="auto">Auto detect</SelectItem><SelectItem value="hi">Hindi</SelectItem>
        <SelectItem value="en">English</SelectItem><SelectItem value="hinglish">Hinglish</SelectItem>
        <SelectItem value="multi">Multilingual</SelectItem>
      </SelectContent>
    </Select>
    <Button className="w-full btn-neon border-0" disabled={busy || (source === "project" && !mainAllowed)} onClick={generate}>
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
      {busy ? "Transcribing…" : "Generate text & captions"}
    </Button>
    {error && <p role="alert" className="text-xs text-destructive break-words">{error}</p>}
    {caps.length > 0 && <>
      <div className="grid grid-cols-3 gap-1">
        {(["txt", "srt", "vtt"] as const).map(format => <Button key={format} variant="outline" size="sm" disabled={busy}
          className="px-1 text-xs" onClick={() => exportText(format)}><Download className="w-3 h-3 mr-1" />{format.toUpperCase()}</Button>)}
      </div>
      <p className="text-[11px] text-muted-foreground">Caption timings are estimated.</p>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {caps.map(c => <div key={c.idx} className="space-y-1">
          <Button size="sm" variant="ghost" className="h-6 px-0 text-xs text-muted-foreground" onClick={() => setTime(c.start_ms / 1000)}>
            {(c.start_ms / 1000).toFixed(1)}s – {(c.end_ms / 1000).toFixed(1)}s
          </Button>
          <Textarea aria-label={`Caption ${c.idx + 1}`} value={c.text} disabled={busy || saving} className="min-h-16 text-xs bg-secondary/30"
            onChange={e => { setDirty(true); setCaps(rows => rows.map(row => row.idx === c.idx ? { ...row, text: e.target.value } : row)); }} />
        </div>)}
      </div>
      <Button variant="secondary" className="w-full" disabled={busy || saving} onClick={() => dirty ? void save() : applyLayers(caps)}>
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Type className="w-4 h-4 mr-2" />}
        {dirty ? "Save & apply captions" : "Apply captions"}
      </Button>
    </>}
  </div>;
};