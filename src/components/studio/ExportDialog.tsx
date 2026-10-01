import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download, Loader2, CheckCircle2, X } from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import { MediaPool, drawFrame } from "@/lib/studio/render";
import { toast } from "sonner";

const RES: Record<string, number> = { "1080p": 1080, "720p": 720, "480p": 480, "360p": 360, "144p": 144 };

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const withTimeout = <T,>(p: Promise<T>, ms: number, msg: string) =>
  Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(msg)), ms))]);

type Result = { url: string; name: string; size: number; ext: string };

export const ExportDialog = () => {
  const { doc, duration } = useStudio();
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState("720p");
  const [fps, setFps] = useState(String(doc.fps || 30));
  const [format, setFormat] = useState("mp4");
  const [bitrate, setBitrate] = useState(8);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const cancelled = useRef(false);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  useEffect(() => { if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [result]);

  const triggerDownload = (r: Result) => {
    const a = document.createElement("a");
    a.href = r.url; a.download = r.name; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
  };

  const run = async () => {
    setBusy(true); setPct(0); setStage("Preparing media…"); cancelled.current = false;
    if (result) { URL.revokeObjectURL(result.url); setResult(null); }
    try {
      const h = RES[res];
      const w = Math.round((h * doc.width) / doc.height / 2) * 2;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false })!;
      const pool = new MediaPool();
      await pool.preload(doc);

      const F = Number(fps);
      const totalFrames = Math.max(1, Math.ceil(duration * F));

      const seekAll = async (t: number) => {
        for (const tr of doc.tracks) for (const c of tr.clips) {
          if (c.kind === "video" && t >= c.start && t < c.start + c.duration) await pool.seek(c, t - c.start);
        }
      };

      await seekAll(0);
      drawFrame(ctx, doc, pool, 0);

      const stream = canvas.captureStream(0);
      const track = stream.getVideoTracks()[0] as any;
      if (typeof track.requestFrame !== "function") throw new Error("Your browser can't record video. Use Chrome or Edge.");

      // Prefer native MP4 recording (Chrome/Edge 126+, Safari) — no slow conversion needed
      const wantMp4 = format === "mp4" || format === "mov";
      const candidates = wantMp4
        ? ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
        : ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
      const mime = candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const recIsMp4 = mime.startsWith("video/mp4");

      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate * 1_000_000 });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<Blob>((r) => { rec.onstop = () => r(new Blob(chunks, { type: recIsMp4 ? "video/mp4" : "video/webm" })); });
      rec.start(1000);
      await new Promise((r) => setTimeout(r, 60));

      setStage("Rendering frames…");
      for (let f = 0; f < totalFrames; f++) {
        if (cancelled.current) break;
        const t = f / F;
        await seekAll(t);
        drawFrame(ctx, doc, pool, t);
        track.requestFrame();
        await new Promise((r) => setTimeout(r, 0));
        if (f % 3 === 0) setPct(Math.round((f / totalFrames) * 100));
      }
      track.requestFrame();
      await new Promise((r) => setTimeout(r, 250));
      rec.stop();
      const blob = await withTimeout(done, 15000, "Recorder did not finish — try again.");

      if (cancelled.current) { toast.message("Export cancelled"); return; }
      if (!blob.size) throw new Error("Recording produced an empty file — try a lower resolution.");
      setPct(100);

      let out = blob;
      let ext = recIsMp4 ? (format === "mov" ? "mov" : "mp4") : "webm";

      const needsConvert = format === "gif" || (wantMp4 && !recIsMp4);
      if (needsConvert) {
        setStage("Converting… (first time can take a minute)");
        try {
          out = await withTimeout((async () => {
            const { FFmpeg } = await import("@ffmpeg/ffmpeg");
            const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
            const ff = new FFmpeg();
            const base = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";
            await ff.load({
              coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
              wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
            });
            await ff.writeFile("in.webm", await fetchFile(blob));
            if (format === "gif") {
              await ff.exec(["-i", "in.webm", "-vf", `fps=15,scale=${Math.min(720, w)}:-1:flags=lanczos`, "out.gif"]);
              return new Blob([(await ff.readFile("out.gif")) as any], { type: "image/gif" });
            }
            const name = format === "mov" ? "out.mov" : "out.mp4";
            await ff.exec(["-i", "in.webm", "-c:v", "libx264", "-preset", "ultrafast", "-b:v", `${bitrate}M`, "-pix_fmt", "yuv420p", name]);
            const data = await ff.readFile(name);
            return new Blob([data as any], { type: format === "mov" ? "video/quicktime" : "video/mp4" });
          })(), 180000, "Conversion timed out");
          if (!out.size) throw new Error("empty");
          ext = format;
        } catch {
          out = blob; ext = "webm";
          toast.message("Conversion not available — saved as WebM instead.");
        }
      }

      const url = URL.createObjectURL(out);
      const r: Result = { url, name: `captra-${res}-${Date.now()}.${ext}`, size: out.size, ext };
      setResult(r);
      triggerDownload(r);
      toast.success(`Export complete · ${ext.toUpperCase()} · ${fmtSize(out.size)}`);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setBusy(false); setPct(0); setStage("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button className="btn-neon border-0"><Download className="w-4 h-4 mr-1" /> Export</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-primary/30 shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Export video</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {result && !busy && (
            <div ref={resultRef} className="rounded-xl border border-accent/40 bg-secondary/40 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="font-medium">Ready to download</span>
              </div>
              <p className="text-xs text-muted-foreground break-all">{result.name}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>Format: <b className="text-foreground">{result.ext.toUpperCase()}</b></span>
                <span>Size: <b className="text-foreground">{fmtSize(result.size)}</b></span>
                <span>Quality: <b className="text-foreground">{res}</b></span>
              </div>
              <Button className="w-full btn-neon border-0" onClick={() => triggerDownload(result)}>
                <Download className="w-4 h-4 mr-2" /> Download {result.ext.toUpperCase()} · {fmtSize(result.size)}
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Resolution</Label>
              <Select value={res} onValueChange={setRes} disabled={busy}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(RES).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frame rate</Label>
              <Select value={fps} onValueChange={setFps} disabled={busy}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{["24", "30", "60"].map((f) => <SelectItem key={f} value={f}>{f} fps</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={setFormat} disabled={busy}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{["mp4", "mov", "webm", "gif"].map((f) => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bitrate — {bitrate} Mbps</Label>
            <Slider value={[bitrate]} min={2} max={40} step={1} disabled={busy} onValueChange={([v]) => setBitrate(v)} />
          </div>

          {busy && (
            <div className="space-y-2">
              <Progress value={pct} />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{stage} {pct > 0 && pct < 100 ? `${pct}%` : ""}</span>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => (cancelled.current = true)}>
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          )}

          <Button disabled={busy} onClick={run} className="w-full btn-neon border-0">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting…</> : result ? "Export again" : "Start export"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Rendered on your device — keep this tab open until it finishes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
