import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Download, Sparkles, Type, Palette, Youtube, Play, Pause, Flame, Plus, Trash2, Scissors,
  ChevronsLeftRight, ChevronLeft, ChevronRight, Wand2, Film, Mic, Image as ImageIcon, Shapes, Circle,
  Undo2, Redo2, Upload, Crown, SkipBack, SkipForward, ZoomIn, ZoomOut, Copy, ArrowUp, ArrowDown, Maximize2, Sliders,
} from "lucide-react";
import { toast } from "sonner";
import { toSRT, toVTT, toTXT, download, Caption } from "@/lib/captionUtils";
import { LANGS } from "@/components/UploadDropzone";

const fontOptions = ["Inter", "Space Grotesk", "Arial", "Georgia", "Impact", "Courier New"];
const positions = ["bottom", "top", "middle"] as const;
type StyleState = { font: string; size: number; color: string; bg: string; bgOpacity: number; position: typeof positions[number]; glow: string };

const STYLE_PRESETS: { name: string; style: StyleState }[] = [
  { name: "Glow ✨", style: { font: "Space Grotesk", size: 42, color: "#ffffff", bg: "#000000", bgOpacity: 0, position: "bottom", glow: "#ff8a1a" } },
  { name: "Neon Cyan", style: { font: "Space Grotesk", size: 40, color: "#e6feff", bg: "#000000", bgOpacity: 0, position: "bottom", glow: "#00ffe0" } },
  { name: "Hot Pink", style: { font: "Space Grotesk", size: 40, color: "#ffffff", bg: "#000000", bgOpacity: 0, position: "bottom", glow: "#ff2d95" } },
  { name: "Classic", style: { font: "Inter", size: 28, color: "#ffffff", bg: "#000000", bgOpacity: 0.6, position: "bottom", glow: "" } },
  { name: "YT Bold", style: { font: "Impact", size: 40, color: "#ffff00", bg: "#000000", bgOpacity: 0.7, position: "bottom", glow: "" } },
  { name: "Reels", style: { font: "Space Grotesk", size: 44, color: "#ffffff", bg: "#7c3aed", bgOpacity: 0.85, position: "middle", glow: "" } },
  { name: "Minimal", style: { font: "Inter", size: 24, color: "#ffffff", bg: "#000000", bgOpacity: 0, position: "bottom", glow: "" } },
  { name: "Podcast", style: { font: "Georgia", size: 26, color: "#ffffff", bg: "#111827", bgOpacity: 0.8, position: "top", glow: "" } },
];

type FxState = { brightness: number; contrast: number; saturation: number; hue: number; blur: number; grayscale: number; sepia: number; vignette: number };
const FX_DEFAULT: FxState = { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, grayscale: 0, sepia: 0, vignette: 0 };
const FX_PRESETS: { name: string; fx: FxState }[] = [
  { name: "None", fx: FX_DEFAULT },
  { name: "Cinematic", fx: { ...FX_DEFAULT, contrast: 115, saturation: 90, brightness: 95, vignette: 45 } },
  { name: "Vintage", fx: { ...FX_DEFAULT, sepia: 45, contrast: 105, saturation: 80, vignette: 30 } },
  { name: "B&W", fx: { ...FX_DEFAULT, grayscale: 100, contrast: 115 } },
  { name: "Warm", fx: { ...FX_DEFAULT, hue: -10, saturation: 120, brightness: 105 } },
  { name: "Cool", fx: { ...FX_DEFAULT, hue: 15, saturation: 110, brightness: 100 } },
  { name: "Vivid", fx: { ...FX_DEFAULT, saturation: 145, contrast: 115 } },
  { name: "Dreamy", fx: { ...FX_DEFAULT, blur: 1, brightness: 110, saturation: 115 } },
  { name: "Noir", fx: { ...FX_DEFAULT, grayscale: 100, contrast: 130, brightness: 90, vignette: 55 } },
];
const fxToCss = (f: FxState) =>
  `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg) blur(${f.blur}px) grayscale(${f.grayscale}%) sepia(${f.sepia}%)`;

const fmtTime = (ms: number) => {
  const s = Math.max(0, ms / 1000);
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(2).padStart(5, "0");
  return `${m}:${sec}`;
};
const todayLabel = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

type PanelKey = "media" | "captions" | "text" | "effects" | "audio" | "youtube" | "elements" | "export";
const SIDEBAR: { key: PanelKey; icon: any; label: string }[] = [
  { key: "media", icon: Film, label: "Media" },
  { key: "captions", icon: Type, label: "Captions" },
  { key: "text", icon: Palette, label: "Style" },
  { key: "effects", icon: Wand2, label: "Effects" },
  { key: "audio", icon: Mic, label: "Audio" },
  { key: "youtube", icon: Youtube, label: "YouTube" },
  { key: "elements", icon: Shapes, label: "Elements" },
  { key: "export", icon: Download, label: "Export" },
];

const Editor = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [project, setProject] = useState<any>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [style, setStyle] = useState<StyleState>({ font: "Space Grotesk", size: 42, color: "#ffffff", bg: "#000000", bgOpacity: 0, position: "bottom", glow: "#ff8a1a" });
  const [fx, setFx] = useState<FxState>(FX_DEFAULT);
  const [yt, setYt] = useState<any>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [burning, setBurning] = useState(false);
  const [activePanel, setActivePanel] = useState<PanelKey>("captions");
  const [zoom, setZoom] = useState(60); // px per second
  const [history, setHistory] = useState<Caption[][]>([]);
  const [future, setFuture] = useState<Caption[][]>([]);
  const timelineRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState<{ idx: number; mode: "move" | "left" | "right"; startX: number; origStart: number; origEnd: number } | null>(null);

  const importVideo = async (file: File) => {
    if (!file || !id || !user) return;
    if (!/^video\//.test(file.type) && !/\.(mp4|mov|avi|mkv)$/i.test(file.name)) return toast.error("Video files only");
    if (file.size > 200 * 1024 * 1024) return toast.error("Max 200 MB");
    toast.loading("Importing video…", { id: "imp" });
    try {
      const ext = file.name.split(".").pop() || "mp4";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("videos").upload(path, file, { contentType: file.type || "video/mp4" });
      if (upErr) throw upErr;
      await supabase.from("projects").update({ video_path: path, status: "uploaded", title: file.name.replace(/\.[^.]+$/, "") }).eq("id", id);
      toast.success("Video imported!", { id: "imp" });
      await loadProj();
    } catch (e: any) { toast.error(e.message || "Import failed", { id: "imp" }); }
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const deltaMs = ((e.clientX - dragging.startX) / zoom) * 1000;
      setCaptions(cs => cs.map(c => {
        if (c.idx !== dragging.idx) return c;
        if (dragging.mode === "move") {
          const dur = dragging.origEnd - dragging.origStart;
          const ns = Math.max(0, dragging.origStart + deltaMs);
          return { ...c, start_ms: ns, end_ms: ns + dur };
        }
        if (dragging.mode === "left") return { ...c, start_ms: Math.max(0, Math.min(dragging.origEnd - 200, dragging.origStart + deltaMs)) };
        return { ...c, end_ms: Math.max(dragging.origStart + 200, dragging.origEnd + deltaMs) };
      }));
    };
    const onUp = async () => {
      const cur = captions.find(c => c.idx === dragging.idx);
      if (cur) await supabase.from("captions").update({ start_ms: cur.start_ms, end_ms: cur.end_ms }).eq("project_id", id!).eq("idx", cur.idx);
      setDragging(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [dragging, zoom, captions, id]);

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);

  const loadProj = async () => {
    if (!id) return;
    const { data: p } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    if (!p) { toast.error("Project not found"); nav("/projects"); return; }
    setProject(p);
    const { data: caps } = await supabase.from("captions").select("*").eq("project_id", id).order("idx");
    setCaptions((caps || []).map(c => ({ idx: c.idx, start_ms: c.start_ms, end_ms: c.end_ms, text: c.text })));
    const { data: ytData } = await supabase.from("yt_metadata").select("*").eq("project_id", id).maybeSingle();
    setYt(ytData);
    if (p.video_path) {
      const { data: signed } = await supabase.storage.from("videos").createSignedUrl(p.video_path, 3600);
      if (signed) setVideoUrl(signed.signedUrl);
    }
  };

  useEffect(() => { if (user && id) loadProj(); }, [user, id]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`proj-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `id=eq.${id}` }, loadProj)
      .on("postgres_changes", { event: "*", schema: "public", table: "captions", filter: `project_id=eq.${id}` }, loadProj)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const activeCap = captions.find(c => currentMs >= c.start_ms && currentMs < c.end_ms);
  const totalMs = Math.max(project?.duration_sec ? project.duration_sec * 1000 : 30000, ...captions.map(c => c.end_ms), 5000);

  const pushHistory = (snap: Caption[]) => { setHistory(h => [...h.slice(-30), snap]); setFuture([]); };
  const undo = async () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setFuture(f => [captions, ...f]);
    setHistory(h => h.slice(0, -1));
    await commitCaptions(prev, false);
  };
  const redo = async () => {
    if (!future.length) return;
    const next = future[0];
    setHistory(h => [...h, captions]);
    setFuture(f => f.slice(1));
    await commitCaptions(next, false);
  };

  const commitCaptions = async (list: Caption[], track = true) => {
    if (track) pushHistory(captions);
    const renumbered = list.map((c, i) => ({ ...c, idx: i }));
    setCaptions(renumbered);
    await supabase.from("captions").delete().eq("project_id", id!);
    if (renumbered.length) {
      await supabase.from("captions").insert(renumbered.map(c => ({ project_id: id!, idx: c.idx, start_ms: c.start_ms, end_ms: c.end_ms, text: c.text })));
    }
  };

  const updateCap = async (idx: number, text: string) => {
    setCaptions(cs => cs.map(c => c.idx === idx ? { ...c, text } : c));
    await supabase.from("captions").update({ text }).eq("project_id", id!).eq("idx", idx);
  };
  const updateCapTime = async (idx: number, field: "start_ms" | "end_ms", ms: number) => {
    setCaptions(cs => cs.map(c => c.idx === idx ? { ...c, [field]: ms } : c));
    const patch: { start_ms?: number; end_ms?: number } = { [field]: ms };
    await supabase.from("captions").update(patch).eq("project_id", id!).eq("idx", idx);
  };
  const addCaption = async () => {
    const now = Math.round((videoRef.current?.currentTime || 0) * 1000);
    const merged = [...captions, { idx: 0, start_ms: now, end_ms: now + 2000, text: "New caption" }].sort((a, b) => a.start_ms - b.start_ms);
    await commitCaptions(merged); toast.success("Added at playhead");
  };
  const deleteCap = async (idx: number) => { await commitCaptions(captions.filter(c => c.idx !== idx)); };
  const splitCap = async (idx: number) => {
    const c = captions.find(x => x.idx === idx); if (!c) return;
    const mid = Math.round((c.start_ms + c.end_ms) / 2);
    const words = c.text.trim().split(/\s+/); const half = Math.ceil(words.length / 2);
    const a: Caption = { ...c, end_ms: mid, text: words.slice(0, half).join(" ") };
    const b: Caption = { ...c, start_ms: mid, text: words.slice(half).join(" ") || "…" };
    await commitCaptions([...captions.filter(x => x.idx !== idx), a, b].sort((x, y) => x.start_ms - y.start_ms));
  };
  const mergeWithNext = async (idx: number) => {
    const sorted = [...captions].sort((a, b) => a.start_ms - b.start_ms);
    const i = sorted.findIndex(c => c.idx === idx); if (i < 0 || i >= sorted.length - 1) return;
    const cur = sorted[i], nxt = sorted[i + 1];
    await commitCaptions([...sorted.slice(0, i), { ...cur, end_ms: nxt.end_ms, text: `${cur.text} ${nxt.text}`.trim() }, ...sorted.slice(i + 2)]);
  };
  const shiftAll = async (deltaMs: number) => {
    await commitCaptions(captions.map(c => ({ ...c, start_ms: Math.max(0, c.start_ms + deltaMs), end_ms: Math.max(0, c.end_ms + deltaMs) })));
    toast.success(`Shifted ${deltaMs > 0 ? "+" : ""}${deltaMs}ms`);
  };

  const retranscribe = async (lang?: string) => {
    if (!id) return;
    const language = lang || project?.language || "auto";
    await supabase.from("projects").update({ status: "transcribing", language, error_message: null }).eq("id", id);
    setProject((p: any) => ({ ...p, status: "transcribing", language }));
    toast.loading(`Generating captions in ${LANGS.find(l => l.value === language)?.label || language}…`, { id: "gen-caps" });
    const { data, error } = await supabase.functions.invoke("transcribe-video", { body: { project_id: id, language } });
    toast.dismiss("gen-caps");
    if (error) { toast.error(error.message || "Caption generation failed"); loadProj(); return; }
    toast.success(`Captions generated (${data?.count || 0} lines)!`); loadProj();
  };

  const genYT = async () => {
    if (!id) return; setYtBusy(true);
    const { data, error } = await supabase.functions.invoke("generate-yt-metadata", { body: { project_id: id } });
    setYtBusy(false);
    if (error) return toast.error(error.message);
    setYt(data); toast.success("YouTube kit generated!");
  };

  const exportFile = (kind: "srt"|"vtt"|"txt") => {
    if (!captions.length) return toast.error("No captions yet");
    const base = (project?.title || "captions").replace(/[^a-z0-9]+/gi, "_");
    if (kind === "srt") download(toSRT(captions), `${base}.srt`, "application/x-subrip");
    if (kind === "vtt") download(toVTT(captions), `${base}.vtt`, "text/vtt");
    if (kind === "txt") download(toTXT(captions), `${base}.txt`, "text/plain");
  };

  const burnIn = async () => {
    if (!videoUrl || !captions.length) return;
    setBurning(true);
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile } = await import("@ffmpeg/util");
      const ff = new FFmpeg();
      await ff.load({
        coreURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js",
        wasmURL: "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.wasm",
      });
      const videoData = await fetchFile(videoUrl);
      await ff.writeFile("in.mp4", videoData);
      await ff.writeFile("subs.srt", new TextEncoder().encode(toSRT(captions)));
      const styleStr = `Fontname=${style.font},Fontsize=${Math.round(style.size/2)},PrimaryColour=&H${style.color.slice(5,7)}${style.color.slice(3,5)}${style.color.slice(1,3)}&,BorderStyle=3,Outline=1,BackColour=&H80000000&,Alignment=${style.position==='top'?8:style.position==='middle'?5:2}`;
      const eqParts: string[] = [];
      const brightnessAdj = (fx.brightness - 100) / 100;
      eqParts.push(`eq=brightness=${brightnessAdj.toFixed(2)}:contrast=${(fx.contrast/100).toFixed(2)}:saturation=${(fx.saturation/100).toFixed(2)}`);
      if (fx.hue !== 0) eqParts.push(`hue=h=${fx.hue}`);
      if (fx.blur > 0) eqParts.push(`gblur=sigma=${fx.blur}`);
      if (fx.grayscale > 0) eqParts.push(`hue=s=${1 - fx.grayscale / 100}`);
      if (fx.sepia > 0) eqParts.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
      if (fx.vignette > 0) eqParts.push(`vignette=PI/${(5 - fx.vignette / 30).toFixed(2)}`);
      eqParts.push(`subtitles=subs.srt:force_style='${styleStr}'`);
      await ff.exec(["-i", "in.mp4", "-vf", eqParts.join(","), "-c:a", "copy", "out.mp4"]);
      const out = await ff.readFile("out.mp4");
      const blob = new Blob([out as unknown as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${(project?.title||"video")}_captioned.mp4`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Burned-in video downloaded!");
    } catch (e: any) { toast.error(e.message || "Burn-in failed"); }
    finally { setBurning(false); }
  };

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };
  const seek = (ms: number) => {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, ms / 1000); setCurrentMs(ms);
  };

  const timelineWidth = useMemo(() => Math.max(800, (totalMs / 1000) * zoom), [totalMs, zoom]);
  const ticks = useMemo(() => {
    const step = zoom < 30 ? 5 : zoom < 60 ? 2 : 1;
    const arr: number[] = [];
    for (let s = 0; s <= totalMs / 1000; s += step) arr.push(s);
    return arr;
  }, [totalMs, zoom]);

  const onTimelineClick = (e: React.MouseEvent) => {
    const rect = timelineRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current!.scrollLeft;
    seek((x / zoom) * 1000);
  };

  if (loading || !user || !project) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;

  const posClass = style.position === "top" ? "top-4" : style.position === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-6";

  return (
    <div className="h-screen w-screen flex flex-col bg-[hsl(240,20%,4%)] text-foreground overflow-hidden">
      {/* TOP BAR */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[hsl(240,20%,6%)]">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center glow">
            <Play className="w-4 h-4 text-white fill-white"/>
          </Link>
          <span className="text-sm text-muted-foreground hidden md:inline">{todayLabel()}</span>
          <span className="text-sm font-medium truncate max-w-[240px] hidden lg:inline">{project.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={undo} disabled={!history.length} className="h-9 w-9"><Undo2 className="w-4 h-4"/></Button>
          <Button size="icon" variant="ghost" onClick={redo} disabled={!future.length} className="h-9 w-9"><Redo2 className="w-4 h-4"/></Button>
          <Button size="icon" variant="ghost" className="h-9 w-9 text-yellow-400"><Crown className="w-4 h-4"/></Button>
          <Button onClick={burnIn} disabled={burning || !videoUrl || !captions.length} className="gradient-primary text-white border-0 h-9 gap-2 px-4">
            {burning ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
            Export
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <nav className="w-[76px] shrink-0 bg-[hsl(240,20%,6%)] border-r border-white/5 flex flex-col items-center py-3 gap-1 overflow-y-auto">
          {SIDEBAR.map(item => {
            const Icon = item.icon; const active = activePanel === item.key;
            return (
              <button key={item.key} onClick={() => setActivePanel(item.key)}
                className={`w-full flex flex-col items-center gap-1 py-2.5 text-[10px] transition relative ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 bg-primary rounded-r"/>}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? "bg-primary/15" : "bg-white/[0.03] hover:bg-white/[0.06]"}`}>
                  <Icon className="w-[18px] h-[18px]"/>
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* PANEL */}
        <aside className="w-[340px] shrink-0 bg-[hsl(240,20%,7%)] border-r border-white/5 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-display font-semibold capitalize">{activePanel}</h2>
            {activePanel === "captions" && (
              <Button size="sm" variant="outline" onClick={addCaption} className="h-7 text-xs"><Plus className="w-3 h-3 mr-1"/>Add</Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activePanel === "media" && (
              <>
                <div className="aspect-video rounded-lg bg-black/40 border border-white/5 overflow-hidden relative group">
                  {videoUrl && <video src={videoUrl} className="w-full h-full object-cover" muted/>}
                </div>
                <p className="text-xs font-medium truncate">{project.title}</p>
                <p className="text-[11px] text-muted-foreground">{project.duration_sec ? `${project.duration_sec.toFixed(1)}s` : "—"} · {project.language || "auto"}</p>
                <input ref={mediaInputRef} type="file" accept="video/*,.mp4,.mov,.avi,.mkv" hidden
                  onChange={(e) => e.target.files?.[0] && importVideo(e.target.files[0])}/>
                <Button onClick={() => mediaInputRef.current?.click()} className="w-full gradient-primary text-white border-0">
                  <Upload className="w-4 h-4 mr-2"/>Import / replace video
                </Button>
                <p className="text-[11px] text-muted-foreground">MP4, MOV, AVI, MKV up to 200 MB. New captions can be generated after import.</p>
              </>
            )}

            {activePanel === "captions" && (
              <>
                {captions.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <Sparkles className="w-8 h-8 mx-auto text-primary"/>
                    <p className="text-xs text-muted-foreground">Generate AI captions to get started</p>
                    <Select value={project.language || "auto"} onValueChange={(v) => setProject((p: any) => ({ ...p, language: v }))}>
                      <SelectTrigger className="bg-white/5 h-9"><SelectValue/></SelectTrigger>
                      <SelectContent>{LANGS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button onClick={() => retranscribe()} disabled={project.status === "transcribing"} className="gradient-primary text-white border-0 w-full">
                      {project.status === "transcribing" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Generating…</> : <><Sparkles className="w-4 h-4 mr-2"/>Generate</>}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1 pb-2 border-b border-white/5">
                      <Button size="sm" variant="ghost" onClick={() => shiftAll(-500)} className="h-7 text-xs px-2"><ChevronLeft className="w-3 h-3"/>0.5s</Button>
                      <Button size="sm" variant="ghost" onClick={() => shiftAll(500)} className="h-7 text-xs px-2">0.5s<ChevronRight className="w-3 h-3"/></Button>
                    </div>
                    {captions.map((c) => {
                      const active = activeCap?.idx === c.idx;
                      return (
                        <div key={c.idx} className={`p-2.5 rounded-lg border ${active ? "border-primary bg-primary/10" : "border-white/5 bg-white/[0.02]"} transition`}>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1.5">
                            <button onClick={() => seek(c.start_ms)} className="hover:text-primary"><Play className="w-3 h-3"/></button>
                            <span className="tabular-nums">{fmtTime(c.start_ms)}</span>
                            <span>→</span>
                            <span className="tabular-nums">{fmtTime(c.end_ms)}</span>
                            <div className="ml-auto flex items-center gap-0.5">
                              <button title="Split" onClick={() => splitCap(c.idx)} className="p-1 hover:text-primary"><Scissors className="w-3 h-3"/></button>
                              <button title="Merge" onClick={() => mergeWithNext(c.idx)} className="p-1 hover:text-primary"><ChevronsLeftRight className="w-3 h-3"/></button>
                              <button title="Delete" onClick={() => deleteCap(c.idx)} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3"/></button>
                            </div>
                          </div>
                          <Textarea rows={2} value={c.text} onChange={(e) => updateCap(c.idx, e.target.value)} className="bg-black/30 border-0 resize-none text-xs min-h-0"/>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {activePanel === "text" && (
              <>
                <div>
                  <Label className="text-xs">Presets</Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {STYLE_PRESETS.map(p => (
                      <Button key={p.name} type="button" size="sm" variant="outline" onClick={() => setStyle(p.style)} className="text-[11px] h-8 px-1">{p.name}</Button>
                    ))}
                  </div>
                </div>
                <div><Label className="text-xs">Font</Label>
                  <Select value={style.font} onValueChange={(v) => setStyle({...style, font: v})}>
                    <SelectTrigger className="bg-white/5 mt-1.5 h-9"><SelectValue/></SelectTrigger>
                    <SelectContent>{fontOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Size · {style.size}px</Label>
                  <Slider min={14} max={64} step={1} value={[style.size]} onValueChange={([v]) => setStyle({...style, size: v})} className="mt-3"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Text</Label><Input type="color" value={style.color} onChange={(e) => setStyle({...style, color: e.target.value})} className="bg-white/5 mt-1.5 h-9 p-1"/></div>
                  <div><Label className="text-xs">BG</Label><Input type="color" value={style.bg} onChange={(e) => setStyle({...style, bg: e.target.value})} className="bg-white/5 mt-1.5 h-9 p-1"/></div>
                </div>
                <div><Label className="text-xs">BG opacity · {Math.round(style.bgOpacity*100)}%</Label>
                  <Slider min={0} max={100} step={5} value={[style.bgOpacity*100]} onValueChange={([v]) => setStyle({...style, bgOpacity: v/100})} className="mt-3"/>
                </div>
                <div><Label className="text-xs">Position</Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {positions.map(p => (
                      <Button key={p} size="sm" variant={style.position===p?"default":"outline"} onClick={() => setStyle({...style, position: p})} className={`text-xs h-8 ${style.position===p?"gradient-primary text-white border-0":""}`}>{p}</Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activePanel === "effects" && (
              <>
                <div>
                  <Label className="text-xs">Filter presets</Label>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    {FX_PRESETS.map(p => (
                      <Button key={p.name} size="sm" variant="outline" onClick={() => setFx(p.fx)} className="text-[11px] h-8 px-1">{p.name}</Button>
                    ))}
                  </div>
                </div>
                {([
                  ["Brightness","brightness","%",20,200,1],
                  ["Contrast","contrast","%",20,200,1],
                  ["Saturation","saturation","%",0,200,1],
                  ["Hue","hue","°",-180,180,1],
                  ["Blur","blur","px",0,10,0.5],
                  ["Grayscale","grayscale","%",0,100,1],
                  ["Sepia","sepia","%",0,100,1],
                  ["Vignette","vignette","%",0,100,1],
                ] as const).map(([label,key,unit,min,max,step]) => (
                  <div key={key}>
                    <Label className="text-xs">{label} · {fx[key as keyof FxState]}{unit}</Label>
                    <Slider min={min} max={max} step={step} value={[fx[key as keyof FxState]]} onValueChange={([v]) => setFx({...fx, [key]: v})} className="mt-3"/>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setFx(FX_DEFAULT)} className="w-full h-8 text-xs">Reset effects</Button>
              </>
            )}

            {activePanel === "audio" && (
              <>
                <Label className="text-xs">Language</Label>
                <Select value={project.language || "auto"} onValueChange={(v) => retranscribe(v)} disabled={project.status === "transcribing"}>
                  <SelectTrigger className="bg-white/5 h-9"><SelectValue/></SelectTrigger>
                  <SelectContent>{LANGS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="outline" onClick={() => retranscribe()} disabled={project.status === "transcribing"} className="w-full">
                  {project.status === "transcribing" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Transcribing…</> : <><Sparkles className="w-4 h-4 mr-2"/>Re-transcribe</>}
                </Button>
                <p className="text-[11px] text-muted-foreground">AI transcribes speech in the selected language. Hindi & Hinglish use Devanagari-tuned Whisper.</p>
              </>
            )}

            {activePanel === "youtube" && (
              <>
                <Button size="sm" onClick={genYT} disabled={ytBusy || !captions.length} className="w-full gradient-primary text-white border-0">
                  {ytBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Sparkles className="w-4 h-4 mr-1"/>Generate YouTube kit</>}
                </Button>
                {yt ? (
                  <>
                    <div><Label className="text-xs">Title</Label><Input value={yt.title || ""} readOnly className="bg-white/5 mt-1.5"/></div>
                    <div><Label className="text-xs">Description</Label><Textarea rows={5} value={yt.description || ""} readOnly className="bg-white/5 mt-1.5"/></div>
                    <div><Label className="text-xs">Hashtags</Label><p className="text-xs mt-1.5">{(yt.hashtags||[]).map((h:string) => `#${h}`).join(" ")}</p></div>
                    <div><Label className="text-xs">Keywords</Label><p className="text-xs mt-1.5 text-muted-foreground">{(yt.keywords||[]).join(", ")}</p></div>
                  </>
                ) : <p className="text-[11px] text-muted-foreground text-center py-4">Generates SEO title, description & hashtags from your captions.</p>}
              </>
            )}

            {activePanel === "elements" && (
              <div className="grid grid-cols-3 gap-2">
                {["●","■","▲","★","♥","◆","✚","➤","◐"].map((s,i) => (
                  <div key={i} className="aspect-square rounded-lg bg-white/5 flex items-center justify-center text-2xl hover:bg-white/10 cursor-pointer">{s}</div>
                ))}
                <p className="col-span-3 text-[11px] text-muted-foreground text-center pt-2">Shape overlays — coming soon</p>
              </div>
            )}

            {activePanel === "export" && (
              <>
                <Label className="text-xs">Caption files</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => exportFile("srt")}><Download className="w-3 h-3 mr-1"/>SRT</Button>
                  <Button variant="outline" size="sm" onClick={() => exportFile("vtt")}><Download className="w-3 h-3 mr-1"/>VTT</Button>
                  <Button variant="outline" size="sm" onClick={() => exportFile("txt")}><Download className="w-3 h-3 mr-1"/>TXT</Button>
                </div>
                <div className="pt-3 border-t border-white/5">
                  <Label className="text-xs">Burn captions & effects into MP4</Label>
                  <p className="text-[11px] text-muted-foreground my-2">Runs in your browser. Under 100 MB is best.</p>
                  <Button className="w-full gradient-primary text-white border-0" onClick={burnIn} disabled={burning || !videoUrl || !captions.length}>
                    {burning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Burning…</> : <><Flame className="w-4 h-4 mr-2"/>Download MP4</>}
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* PREVIEW + TIMELINE */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center p-6 bg-[hsl(240,20%,3%)] relative overflow-hidden">
            <div className="relative max-w-full max-h-full aspect-video w-full h-full flex items-center justify-center">
              <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]">
                {videoUrl ? (
                  <video ref={videoRef} src={videoUrl} className="w-full h-full object-contain"
                    style={{ filter: fxToCss(fx) }}
                    onTimeUpdate={(e) => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}
                    onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No video</div>
                )}
                {fx.vignette > 0 && (
                  <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: `inset 0 0 ${80 + fx.vignette * 3}px ${20 + fx.vignette}px rgba(0,0,0,${fx.vignette / 100})` }}/>
                )}
                {activeCap && (
                  <div className={`absolute left-1/2 -translate-x-1/2 ${posClass} px-4 py-2 rounded max-w-[90%] text-center pointer-events-none`}
                    style={{
                      fontFamily: style.font, fontSize: `${style.size}px`, color: style.color,
                      background: `${style.bg}${Math.round(style.bgOpacity*255).toString(16).padStart(2,"0")}`,
                      textShadow: "0 2px 4px rgba(0,0,0,0.8)", fontWeight: 600,
                    }}>{activeCap.text}</div>
                )}
              </div>
            </div>
          </div>

          {/* TRANSPORT */}
          <div className="h-12 border-t border-white/5 bg-[hsl(240,20%,6%)] flex items-center px-4 gap-3">
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => seek(0)}><SkipBack className="w-4 h-4"/></Button>
              <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20" onClick={togglePlay}>
                {playing ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4 ml-0.5"/>}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => seek(totalMs)}><SkipForward className="w-4 h-4"/></Button>
            </div>
            <div className="text-xs tabular-nums text-muted-foreground">
              <span className="text-foreground">{fmtTime(currentMs)}</span> / {fmtTime(totalMs)}
            </div>
            <div className="flex-1"/>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(z => Math.max(20, z - 20))}><ZoomOut className="w-4 h-4"/></Button>
              <Slider min={20} max={200} step={10} value={[zoom]} onValueChange={([v]) => setZoom(v)} className="w-24"/>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setZoom(z => Math.min(200, z + 20))}><ZoomIn className="w-4 h-4"/></Button>
            </div>
          </div>

          {/* TIMELINE */}
          <div ref={timelineRef} className="h-[220px] bg-[hsl(240,20%,5%)] border-t border-white/5 overflow-x-auto overflow-y-hidden relative">
            <div className="relative" style={{ width: `${timelineWidth}px`, minWidth: "100%" }}>
              {/* Ruler */}
              <div className="h-7 border-b border-white/5 sticky top-0 bg-[hsl(240,20%,5%)] z-10 cursor-pointer" onClick={onTimelineClick}>
                {ticks.map(s => (
                  <div key={s} className="absolute top-0 h-full flex flex-col items-start" style={{ left: `${s * zoom}px` }}>
                    <div className="w-px h-2 bg-white/20 mt-1"/>
                    <span className="text-[10px] text-muted-foreground ml-1 tabular-nums">0:{s.toString().padStart(2, "0")}</span>
                  </div>
                ))}
              </div>

              {/* Video track */}
              <div className="mx-2 mt-2">
                <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Film className="w-3 h-3"/>Video</div>
                <div className="h-14 rounded-md bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 border border-white/10 relative overflow-hidden"
                  style={{ width: `${(totalMs / 1000) * zoom - 8}px` }}>
                  <div className="absolute inset-0 flex items-center px-2 text-[11px] font-medium truncate">{project.title}</div>
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 20px, rgba(255,255,255,0.06) 20px 21px)" }}/>
                </div>
              </div>

              {/* Captions track */}
              <div className="mx-2 mt-2 relative">
                <div className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><Type className="w-3 h-3"/>Captions</div>
                <div className="h-10 rounded-md bg-white/[0.02] border border-white/5 relative" style={{ width: `${(totalMs / 1000) * zoom - 8}px` }}>
                  {captions.map(c => {
                    const left = (c.start_ms / 1000) * zoom;
                    const width = ((c.end_ms - c.start_ms) / 1000) * zoom;
                    const active = activeCap?.idx === c.idx;
                    const startDrag = (e: React.PointerEvent, mode: "move" | "left" | "right") => {
                      e.stopPropagation(); e.preventDefault();
                      setDragging({ idx: c.idx, mode, startX: e.clientX, origStart: c.start_ms, origEnd: c.end_ms });
                    };
                    return (
                      <div key={c.idx}
                        onDoubleClick={() => seek(c.start_ms)}
                        onPointerDown={(e) => startDrag(e, "move")}
                        title={`${c.text}\n(drag to move · edges to resize · double-click to seek)`}
                        className={`absolute top-1 bottom-1 rounded px-2 flex items-center text-[10px] truncate select-none group/cap ${dragging?.idx === c.idx ? "cursor-grabbing" : "cursor-grab"} ${active ? "bg-primary text-primary-foreground ring-2 ring-primary-glow" : "bg-accent/70 text-accent-foreground hover:bg-accent"}`}
                        style={{ left: `${left}px`, width: `${Math.max(30, width)}px` }}>
                        <div onPointerDown={(e) => startDrag(e, "left")} className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30 opacity-0 group-hover/cap:opacity-100 rounded-l"/>
                        <span className="truncate pointer-events-none flex-1">{c.text}</span>
                        <div onPointerDown={(e) => startDrag(e, "right")} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/30 opacity-0 group-hover/cap:opacity-100 rounded-r"/>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Playhead */}
              <div className="absolute top-0 bottom-0 w-px bg-primary-glow pointer-events-none z-20"
                style={{ left: `${(currentMs / 1000) * zoom}px` }}>
                <div className="absolute -top-0 -left-1.5 w-3 h-3 rounded-full bg-primary-glow shadow-[0_0_10px_hsl(var(--primary-glow))]"/>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Editor;
