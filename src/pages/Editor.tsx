import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Download, Sparkles, Type, Palette, Youtube, Play, Flame, Plus, Trash2, Scissors, ArrowDown, ChevronsLeftRight, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { toSRT, toVTT, toTXT, download, Caption } from "@/lib/captionUtils";
import { LANGS } from "@/components/UploadDropzone";

const fontOptions = ["Inter", "Space Grotesk", "Arial", "Georgia", "Impact", "Courier New"];
const positions = ["bottom", "top", "middle"] as const;

type StyleState = { font: string; size: number; color: string; bg: string; bgOpacity: number; position: typeof positions[number] };

const STYLE_PRESETS: { name: string; style: StyleState }[] = [
  { name: "Classic", style: { font: "Inter", size: 28, color: "#ffffff", bg: "#000000", bgOpacity: 0.6, position: "bottom" } },
  { name: "YouTube Bold", style: { font: "Impact", size: 40, color: "#ffff00", bg: "#000000", bgOpacity: 0.7, position: "bottom" } },
  { name: "Reels/Shorts", style: { font: "Space Grotesk", size: 44, color: "#ffffff", bg: "#7c3aed", bgOpacity: 0.85, position: "middle" } },
  { name: "Minimal", style: { font: "Inter", size: 24, color: "#ffffff", bg: "#000000", bgOpacity: 0, position: "bottom" } },
  { name: "Neon", style: { font: "Space Grotesk", size: 36, color: "#00ffe0", bg: "#000000", bgOpacity: 0.4, position: "bottom" } },
  { name: "Podcast Top", style: { font: "Georgia", size: 26, color: "#ffffff", bg: "#111827", bgOpacity: 0.8, position: "top" } },
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

const Editor = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [project, setProject] = useState<any>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [style, setStyle] = useState({ font: "Inter", size: 28, color: "#ffffff", bg: "#000000", bgOpacity: 0.6, position: "bottom" as typeof positions[number] });
  const [yt, setYt] = useState<any>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [burning, setBurning] = useState(false);
  const [fx, setFx] = useState<FxState>(FX_DEFAULT);

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

  const updateCap = async (idx: number, text: string) => {
    setCaptions(cs => cs.map(c => c.idx === idx ? { ...c, text } : c));
    await supabase.from("captions").update({ text }).eq("project_id", id!).eq("idx", idx);
  };

  const updateCapTime = async (idx: number, field: "start_ms" | "end_ms", ms: number) => {
    setCaptions(cs => cs.map(c => c.idx === idx ? { ...c, [field]: ms } : c));
    const patch: { start_ms?: number; end_ms?: number } = { [field]: ms };
    await supabase.from("captions").update(patch).eq("project_id", id!).eq("idx", idx);
  };

  const reindex = async (list: Caption[]) => {
    // Rewrite indices to be sequential; delete-all + insert to keep it simple & safe.
    const renumbered = list.map((c, i) => ({ ...c, idx: i }));
    setCaptions(renumbered);
    await supabase.from("captions").delete().eq("project_id", id!);
    if (renumbered.length) {
      await supabase.from("captions").insert(renumbered.map(c => ({ project_id: id!, idx: c.idx, start_ms: c.start_ms, end_ms: c.end_ms, text: c.text })));
    }
  };

  const addCaption = async () => {
    const now = Math.round((videoRef.current?.currentTime || 0) * 1000);
    const newCap: Caption = { idx: 0, start_ms: now, end_ms: now + 2000, text: "New caption" };
    const merged = [...captions, newCap].sort((a, b) => a.start_ms - b.start_ms);
    await reindex(merged);
    toast.success("Caption added at playhead");
  };

  const deleteCap = async (idx: number) => {
    const filtered = captions.filter(c => c.idx !== idx);
    await reindex(filtered);
  };

  const splitCap = async (idx: number) => {
    const c = captions.find(x => x.idx === idx); if (!c) return;
    const mid = Math.round((c.start_ms + c.end_ms) / 2);
    const words = c.text.trim().split(/\s+/);
    const half = Math.ceil(words.length / 2);
    const a: Caption = { ...c, end_ms: mid, text: words.slice(0, half).join(" ") };
    const b: Caption = { ...c, start_ms: mid, text: words.slice(half).join(" ") || "…" };
    const rest = captions.filter(x => x.idx !== idx);
    const merged = [...rest, a, b].sort((x, y) => x.start_ms - y.start_ms);
    await reindex(merged);
  };

  const mergeWithNext = async (idx: number) => {
    const sorted = [...captions].sort((a, b) => a.start_ms - b.start_ms);
    const i = sorted.findIndex(c => c.idx === idx);
    if (i < 0 || i >= sorted.length - 1) return;
    const cur = sorted[i], nxt = sorted[i + 1];
    const merged: Caption = { ...cur, end_ms: nxt.end_ms, text: `${cur.text} ${nxt.text}`.trim() };
    const list = [...sorted.slice(0, i), merged, ...sorted.slice(i + 2)];
    await reindex(list);
  };

  const shiftAll = async (deltaMs: number) => {
    const shifted = captions.map(c => ({ ...c, start_ms: Math.max(0, c.start_ms + deltaMs), end_ms: Math.max(0, c.end_ms + deltaMs) }));
    await reindex(shifted);
    toast.success(`Shifted all captions by ${deltaMs > 0 ? "+" : ""}${deltaMs}ms`);
  };

  const retranscribe = async (lang?: string) => {
    if (!id) return;
    const language = lang || project?.language || "auto";
    await supabase.from("projects").update({ status: "transcribing", language, error_message: null }).eq("id", id);
    setProject((p: any) => ({ ...p, status: "transcribing", language }));
    toast.loading(`Generating captions in ${LANGS.find(l => l.value === language)?.label || language}…`, { id: "gen-caps" });
    const { data, error } = await supabase.functions.invoke("transcribe-video", { body: { project_id: id, language } });
    toast.dismiss("gen-caps");
    if (error) {
      toast.error(error.message || "Caption generation failed");
      loadProj();
      return;
    }
    toast.success(`Captions generated (${data?.count || 0} lines)!`);
    loadProj();
  };

  const genYT = async () => {
    if (!id) return; setYtBusy(true);
    const { data, error } = await supabase.functions.invoke("generate-yt-metadata", { body: { project_id: id } });
    setYtBusy(false);
    if (error) return toast.error(error.message);
    setYt(data);
    toast.success("YouTube kit generated!");
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
      // Build ffmpeg filter chain: color effects → vignette → subtitles
      const eqParts: string[] = [];
      const brightnessAdj = (fx.brightness - 100) / 100; // -1..1
      const contrastAdj = fx.contrast / 100;
      const satAdj = fx.saturation / 100;
      eqParts.push(`eq=brightness=${brightnessAdj.toFixed(2)}:contrast=${contrastAdj.toFixed(2)}:saturation=${satAdj.toFixed(2)}`);
      if (fx.hue !== 0) eqParts.push(`hue=h=${fx.hue}`);
      if (fx.blur > 0) eqParts.push(`gblur=sigma=${fx.blur}`);
      if (fx.grayscale > 0) eqParts.push(`hue=s=${1 - fx.grayscale / 100}`);
      if (fx.sepia > 0) {
        const s = fx.sepia / 100;
        eqParts.push(`colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131`);
        if (s < 1) eqParts.push(`eq=saturation=${(1 - s * 0.5).toFixed(2)}`);
      }
      if (fx.vignette > 0) eqParts.push(`vignette=PI/${(5 - fx.vignette / 30).toFixed(2)}`);
      eqParts.push(`subtitles=subs.srt:force_style='${styleStr}'`);
      await ff.exec(["-i", "in.mp4", "-vf", eqParts.join(","), "-c:a", "copy", "out.mp4"]);
      const out = await ff.readFile("out.mp4");
      const blob = new Blob([out as unknown as BlobPart], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${(project?.title||"video")}_captioned.mp4`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Burned-in video downloaded!");
    } catch (e: any) {
      toast.error(e.message || "Burn-in failed");
    } finally { setBurning(false); }
  };

  if (loading || !user || !project) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;

  const posClass = style.position === "top" ? "top-4" : style.position === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-6";

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-24 pb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold truncate max-w-xl">{project.title}</h1>
            <p className="text-xs text-muted-foreground">Status: <span className="capitalize">{project.status}</span></p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={project.language || "auto"} onValueChange={(v) => retranscribe(v)} disabled={project.status === "transcribing"}>
              <SelectTrigger className="bg-secondary/50 h-9 w-[190px]"><SelectValue placeholder="Language"/></SelectTrigger>
              <SelectContent>
                {LANGS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {project.status !== "transcribing" && <Button variant="outline" size="sm" onClick={() => retranscribe()}><Sparkles className="w-4 h-4 mr-1"/>Re-transcribe</Button>}
          </div>
        </div>

        {project.status === "transcribing" && (
          <GlassCard className="mb-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary"/>
            <p className="text-sm">AI is transcribing your video… captions will appear here automatically.</p>
          </GlassCard>
        )}
        {project.status === "failed" && (
          <GlassCard className="mb-4 border-destructive/50">
            <p className="text-sm text-destructive">Transcription failed: {project.error_message || "Unknown error"}</p>
          </GlassCard>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* VIDEO */}
          <div>
            <GlassCard className="p-0 overflow-hidden">
              <div className="relative aspect-video bg-black">
                {videoUrl && (
                  <video ref={videoRef} src={videoUrl} controls className="w-full h-full"
                    style={{ filter: fxToCss(fx) }}
                    onTimeUpdate={(e) => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}/>
                )}
                {fx.vignette > 0 && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ boxShadow: `inset 0 0 ${80 + fx.vignette * 3}px ${20 + fx.vignette}px rgba(0,0,0,${fx.vignette / 100})` }}/>
                )}
                {activeCap && (
                  <div className={`absolute left-1/2 -translate-x-1/2 ${posClass} px-4 py-2 rounded max-w-[90%] text-center pointer-events-none`}
                    style={{
                      fontFamily: style.font,
                      fontSize: `${style.size}px`,
                      color: style.color,
                      background: `${style.bg}${Math.round(style.bgOpacity*255).toString(16).padStart(2,"0")}`,
                      textShadow: "0 2px 4px rgba(0,0,0,0.8)",
                      fontWeight: 600,
                    }}>
                    {activeCap.text}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* PANEL */}
          <Tabs defaultValue="captions">
            <TabsList className="grid grid-cols-5 mb-3 bg-secondary/50">
              <TabsTrigger value="captions"><Type className="w-3.5 h-3.5 mr-1"/>Captions</TabsTrigger>
              <TabsTrigger value="style"><Palette className="w-3.5 h-3.5 mr-1"/>Style</TabsTrigger>
              <TabsTrigger value="effects"><Wand2 className="w-3.5 h-3.5 mr-1"/>Effects</TabsTrigger>
              <TabsTrigger value="youtube"><Youtube className="w-3.5 h-3.5 mr-1"/>YouTube</TabsTrigger>
              <TabsTrigger value="export"><Download className="w-3.5 h-3.5 mr-1"/>Export</TabsTrigger>
            </TabsList>

            <TabsContent value="captions">
              <GlassCard className="max-h-[75vh] overflow-y-auto space-y-2">
                {captions.length === 0 ? (
                  <div className="text-center py-10 space-y-4">
                    <p className="text-sm text-muted-foreground">No captions yet. Pick a language and generate.</p>
                    <div className="flex justify-center">
                      <Select value={project.language || "auto"} onValueChange={(v) => setProject((p: any) => ({ ...p, language: v }))}>
                        <SelectTrigger className="bg-secondary/50 h-9 w-[220px]"><SelectValue/></SelectTrigger>
                        <SelectContent>{LANGS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => retranscribe()} disabled={project.status === "transcribing"} className="gradient-primary text-white border-0">
                      {project.status === "transcribing" ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Generating…</> : <><Sparkles className="w-4 h-4 mr-2"/>Generate Captions</>}
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Editing toolbar */}
                    <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border sticky top-0 bg-card/80 backdrop-blur z-10">
                      <Button size="sm" variant="outline" onClick={addCaption}><Plus className="w-3.5 h-3.5 mr-1"/>Add at playhead</Button>
                      <div className="flex items-center gap-1 ml-auto">
                        <span className="text-xs text-muted-foreground mr-1">Shift all:</span>
                        <Button size="sm" variant="outline" onClick={() => shiftAll(-500)}><ChevronLeft className="w-3.5 h-3.5"/>-0.5s</Button>
                        <Button size="sm" variant="outline" onClick={() => shiftAll(500)}>+0.5s<ChevronRight className="w-3.5 h-3.5"/></Button>
                      </div>
                    </div>
                    {captions.map((c, i) => {
                      const active = activeCap?.idx === c.idx;
                      return (
                        <div key={`${c.idx}-${i}`} className={`p-3 rounded-lg border ${active ? "border-primary bg-primary/5" : "border-border"} transition`}>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                            <button onClick={() => { if (videoRef.current) { videoRef.current.currentTime = c.start_ms/1000; videoRef.current.play(); } }} className="hover:text-primary">
                              <Play className="w-3 h-3"/>
                            </button>
                            <Input type="number" step="0.1" value={(c.start_ms/1000).toFixed(1)}
                              onChange={(e) => updateCapTime(c.idx, "start_ms", Math.round(parseFloat(e.target.value)*1000))}
                              className="h-6 w-16 text-xs px-1.5 bg-secondary/40"/>
                            <span>→</span>
                            <Input type="number" step="0.1" value={(c.end_ms/1000).toFixed(1)}
                              onChange={(e) => updateCapTime(c.idx, "end_ms", Math.round(parseFloat(e.target.value)*1000))}
                              className="h-6 w-16 text-xs px-1.5 bg-secondary/40"/>
                            <span className="text-[10px] opacity-70">s</span>
                            <div className="ml-auto flex items-center gap-1">
                              <button title="Split" onClick={() => splitCap(c.idx)} className="p-1 hover:text-primary rounded"><Scissors className="w-3.5 h-3.5"/></button>
                              <button title="Merge with next" onClick={() => mergeWithNext(c.idx)} className="p-1 hover:text-primary rounded"><ChevronsLeftRight className="w-3.5 h-3.5"/></button>
                              <button title="Delete" onClick={() => deleteCap(c.idx)} className="p-1 hover:text-destructive rounded"><Trash2 className="w-3.5 h-3.5"/></button>
                            </div>
                          </div>
                          <Textarea rows={2} value={c.text} onChange={(e) => updateCap(c.idx, e.target.value)}
                            className="bg-secondary/30 border-0 resize-none text-sm"/>
                        </div>
                      );
                    })}
                  </>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="style">
              <GlassCard className="space-y-4">
                <div>
                  <Label>Presets</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {STYLE_PRESETS.map(p => (
                      <Button key={p.name} type="button" size="sm" variant="outline" onClick={() => setStyle(p.style)} className="text-xs">
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div><Label>Font</Label>
                  <Select value={style.font} onValueChange={(v) => setStyle({...style, font: v})}>
                    <SelectTrigger className="bg-secondary/50 mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>{fontOptions.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Size · {style.size}px</Label>
                  <Slider min={14} max={64} step={1} value={[style.size]} onValueChange={([v]) => setStyle({...style, size: v})} className="mt-3"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Text color</Label><Input type="color" value={style.color} onChange={(e) => setStyle({...style, color: e.target.value})} className="bg-secondary/50 mt-1.5 h-10"/></div>
                  <div><Label>Background</Label><Input type="color" value={style.bg} onChange={(e) => setStyle({...style, bg: e.target.value})} className="bg-secondary/50 mt-1.5 h-10"/></div>
                </div>
                <div><Label>BG opacity · {Math.round(style.bgOpacity*100)}%</Label>
                  <Slider min={0} max={100} step={5} value={[style.bgOpacity*100]} onValueChange={([v]) => setStyle({...style, bgOpacity: v/100})} className="mt-3"/>
                </div>
                <div><Label>Position</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {positions.map(p => (
                      <Button key={p} type="button" size="sm" variant={style.position===p?"default":"outline"} onClick={() => setStyle({...style, position: p})} className={style.position===p?"gradient-primary text-white border-0":""}>{p}</Button>
                    ))}
                  </div>
                </div>
              </GlassCard>
            </TabsContent>

            <TabsContent value="effects">
              <GlassCard className="space-y-4">
                <div>
                  <Label>Filter presets</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    {FX_PRESETS.map(p => (
                      <Button key={p.name} type="button" size="sm" variant="outline" onClick={() => setFx(p.fx)} className="text-xs">{p.name}</Button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Brightness · {fx.brightness}%</Label>
                    <Slider min={20} max={200} step={1} value={[fx.brightness]} onValueChange={([v]) => setFx({...fx, brightness: v})} className="mt-3"/></div>
                  <div><Label>Contrast · {fx.contrast}%</Label>
                    <Slider min={20} max={200} step={1} value={[fx.contrast]} onValueChange={([v]) => setFx({...fx, contrast: v})} className="mt-3"/></div>
                  <div><Label>Saturation · {fx.saturation}%</Label>
                    <Slider min={0} max={200} step={1} value={[fx.saturation]} onValueChange={([v]) => setFx({...fx, saturation: v})} className="mt-3"/></div>
                  <div><Label>Hue · {fx.hue}°</Label>
                    <Slider min={-180} max={180} step={1} value={[fx.hue]} onValueChange={([v]) => setFx({...fx, hue: v})} className="mt-3"/></div>
                  <div><Label>Blur · {fx.blur}px</Label>
                    <Slider min={0} max={10} step={0.5} value={[fx.blur]} onValueChange={([v]) => setFx({...fx, blur: v})} className="mt-3"/></div>
                  <div><Label>Grayscale · {fx.grayscale}%</Label>
                    <Slider min={0} max={100} step={1} value={[fx.grayscale]} onValueChange={([v]) => setFx({...fx, grayscale: v})} className="mt-3"/></div>
                  <div><Label>Sepia · {fx.sepia}%</Label>
                    <Slider min={0} max={100} step={1} value={[fx.sepia]} onValueChange={([v]) => setFx({...fx, sepia: v})} className="mt-3"/></div>
                  <div><Label>Vignette · {fx.vignette}%</Label>
                    <Slider min={0} max={100} step={1} value={[fx.vignette]} onValueChange={([v]) => setFx({...fx, vignette: v})} className="mt-3"/></div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setFx(FX_DEFAULT)} className="w-full">Reset effects</Button>
                <p className="text-xs text-muted-foreground">Effects are applied to the preview instantly and burned into the exported video.</p>
              </GlassCard>
            </TabsContent>

            <TabsContent value="youtube">
              <GlassCard className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold">AI YouTube Kit</h3>
                  <Button size="sm" onClick={genYT} disabled={ytBusy || !captions.length} className="gradient-primary text-white border-0">
                    {ytBusy ? <Loader2 className="w-4 h-4 animate-spin"/> : <><Sparkles className="w-4 h-4 mr-1"/>Generate</>}
                  </Button>
                </div>
                {yt ? (
                  <>
                    <div><Label>Title</Label><Input value={yt.title || ""} readOnly className="bg-secondary/50 mt-1.5"/></div>
                    <div><Label>Description</Label><Textarea rows={5} value={yt.description || ""} readOnly className="bg-secondary/50 mt-1.5"/></div>
                    <div><Label>Hashtags</Label><p className="text-sm mt-1.5">{(yt.hashtags||[]).map((h:string) => `#${h}`).join(" ")}</p></div>
                    <div><Label>Keywords</Label><p className="text-sm mt-1.5 text-muted-foreground">{(yt.keywords||[]).join(", ")}</p></div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">Click Generate to create title, description, hashtags & keywords from your captions.</p>
                )}
              </GlassCard>
            </TabsContent>

            <TabsContent value="export">
              <GlassCard className="space-y-3">
                <h3 className="font-display font-semibold">Caption files</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => exportFile("srt")}><Download className="w-4 h-4 mr-1"/>SRT</Button>
                  <Button variant="outline" onClick={() => exportFile("vtt")}><Download className="w-4 h-4 mr-1"/>VTT</Button>
                  <Button variant="outline" onClick={() => exportFile("txt")}><Download className="w-4 h-4 mr-1"/>TXT</Button>
                </div>
                <div className="pt-3 border-t border-border">
                  <h3 className="font-display font-semibold mb-2">Burn captions into video</h3>
                  <p className="text-xs text-muted-foreground mb-3">Runs in your browser. Best for videos under 100 MB — larger files can take several minutes.</p>
                  <Button className="w-full gradient-primary text-white border-0" onClick={burnIn} disabled={burning || !videoUrl || !captions.length}>
                    {burning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Burning…</> : <><Flame className="w-4 h-4 mr-2"/>Download with Captions</>}
                  </Button>
                </div>
              </GlassCard>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Editor;
