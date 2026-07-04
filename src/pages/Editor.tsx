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
import { Loader2, Download, Sparkles, Type, Palette, Youtube, Play, Flame } from "lucide-react";
import { toast } from "sonner";
import { toSRT, toVTT, toTXT, download, Caption } from "@/lib/captionUtils";

const fontOptions = ["Inter", "Space Grotesk", "Arial", "Georgia", "Impact", "Courier New"];
const positions = ["bottom", "top", "middle"] as const;

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

  const retranscribe = async () => {
    if (!id) return;
    await supabase.from("projects").update({ status: "transcribing" }).eq("id", id);
    supabase.functions.invoke("transcribe-video", { body: { project_id: id } }).catch(() => {});
    toast.success("Re-transcribing…");
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
      await ff.exec(["-i", "in.mp4", "-vf", `subtitles=subs.srt:force_style='${styleStr}'`, "-c:a", "copy", "out.mp4"]);
      const out = await ff.readFile("out.mp4");
      const blob = new Blob([new Uint8Array(out as ArrayBuffer)], { type: "video/mp4" });
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
          <div className="flex gap-2">
            {project.status !== "transcribing" && <Button variant="outline" size="sm" onClick={retranscribe}><Sparkles className="w-4 h-4 mr-1"/>Re-transcribe</Button>}
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
                    onTimeUpdate={(e) => setCurrentMs(Math.round(e.currentTarget.currentTime * 1000))}/>
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
            <TabsList className="grid grid-cols-4 mb-3 bg-secondary/50">
              <TabsTrigger value="captions"><Type className="w-3.5 h-3.5 mr-1"/>Captions</TabsTrigger>
              <TabsTrigger value="style"><Palette className="w-3.5 h-3.5 mr-1"/>Style</TabsTrigger>
              <TabsTrigger value="youtube"><Youtube className="w-3.5 h-3.5 mr-1"/>YouTube</TabsTrigger>
              <TabsTrigger value="export"><Download className="w-3.5 h-3.5 mr-1"/>Export</TabsTrigger>
            </TabsList>

            <TabsContent value="captions">
              <GlassCard className="max-h-[70vh] overflow-y-auto space-y-2">
                {captions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-10">No captions yet.</p>
                ) : captions.map(c => {
                  const active = activeCap?.idx === c.idx;
                  return (
                    <div key={c.idx} className={`p-3 rounded-lg border ${active ? "border-primary bg-primary/5" : "border-border"} cursor-pointer transition`}
                      onClick={() => { if (videoRef.current) videoRef.current.currentTime = c.start_ms/1000; }}>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                        <Play className="w-3 h-3"/> {(c.start_ms/1000).toFixed(1)}s → {(c.end_ms/1000).toFixed(1)}s
                      </div>
                      <Textarea rows={2} value={c.text} onChange={(e) => updateCap(c.idx, e.target.value)}
                        onClick={(e) => e.stopPropagation()} className="bg-secondary/30 border-0 resize-none text-sm"/>
                    </div>
                  );
                })}
              </GlassCard>
            </TabsContent>

            <TabsContent value="style">
              <GlassCard className="space-y-4">
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
