import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/studio/store";
import { MediaPool, drawFrame } from "@/lib/studio/render";
import { toast } from "sonner";

const RES: Record<string, number> = { "720p": 720, "1080p": 1080, "2K": 1440, "4K": 2160 };

export const ExportDialog = () => {
  const { doc, duration } = useStudio();
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState("1080p");
  const [fps, setFps] = useState(String(doc.fps || 30));
  const [format, setFormat] = useState("mp4");
  const [bitrate, setBitrate] = useState(12);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const cancelled = useRef(false);

  const run = async () => {
    setBusy(true); setPct(0); cancelled.current = false;
    try {
      const h = RES[res];
      const w = Math.round((h * doc.width) / doc.height / 2) * 2;
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: false })!;
      const pool = new MediaPool();
      await pool.preload(doc);

      const F = Number(fps);
      const totalFrames = Math.max(1, Math.ceil(duration * F));

      const seekAll = async (t: number) => {
        for (const tr of doc.tracks) for (const c of tr.clips) {
          if (c.kind === "video" && t >= c.start && t < c.start + c.duration) await pool.seek(c, t - c.start);
        }
      };

      // paint the very first frame BEFORE recording starts, else the file opens on black
      await seekAll(0);
      drawFrame(ctx, doc, pool, 0);

      const stream = canvas.captureStream(0);
      const track = stream.getVideoTracks()[0] as any;
      if (typeof track.requestFrame !== "function") throw new Error("Your browser can't record canvas video. Use Chrome or Edge.");
      const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate * 1_000_000 });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<Blob>((res2) => { rec.onstop = () => res2(new Blob(chunks, { type: "video/webm" })); });
      rec.start(1000);
      await new Promise((r) => setTimeout(r, 60));

      for (let f = 0; f < totalFrames; f++) {
        if (cancelled.current) break;
        const t = f / F;
        await seekAll(t);
        drawFrame(ctx, doc, pool, t);
        track.requestFrame();
        // yield every frame so the recorder can actually encode what we painted
        await new Promise((r) => setTimeout(r, 0));
        if (f % 3 === 0) setPct(Math.round((f / totalFrames) * 100));
      }
      // hold the last frame briefly so the tail isn't dropped
      track.requestFrame();
      await new Promise((r) => setTimeout(r, 200));
      rec.stop();
      const blob = await done;
      if (!blob.size) throw new Error("Recording produced an empty file — try a lower resolution.");
      setPct(100);


      let out = blob;
      let ext = "webm";
      if (format !== "webm") {
        try {
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
            out = new Blob([(await ff.readFile("out.gif")) as any], { type: "image/gif" }); ext = "gif";
          } else {
            const name = format === "mov" ? "out.mov" : "out.mp4";
            await ff.exec(["-i", "in.webm", "-c:v", "libx264", "-preset", "veryfast", "-b:v", `${bitrate}M`, "-pix_fmt", "yuv420p", "-r", fps, name]);
            out = new Blob([(await ff.readFile(name)) as any], { type: format === "mov" ? "video/quicktime" : "video/mp4" });
            ext = format;
          }
        } catch {
          toast.message("Converted file unavailable — saved as WebM instead.");
        }
      }

      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url; a.download = `export-${res}.${ext}`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Export complete");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    } finally {
      setBusy(false); setPct(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
      <DialogTrigger asChild>
        <Button className="btn-neon border-0"><Download className="w-4 h-4 mr-1" /> Export</Button>
      </DialogTrigger>
      <DialogContent className="glass neon-card bg-card/95 backdrop-blur-2xl border-primary/30">
        <DialogHeader><DialogTitle className="font-display">Export video</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Resolution</Label>
              <Select value={res} onValueChange={setRes}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(RES).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Frame rate</Label>
              <Select value={fps} onValueChange={setFps}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{["24", "30", "60"].map((f) => <SelectItem key={f} value={f}>{f} fps</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>{["mp4", "mov", "webm", "gif"].map((f) => <SelectItem key={f} value={f}>{f.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bitrate — {bitrate} Mbps</Label>
            <Slider value={[bitrate]} min={2} max={60} step={1} onValueChange={([v]) => setBitrate(v)} />
          </div>
          {busy && (
            <div className="space-y-2">
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">Rendering frame-by-frame — {pct}%</p>
            </div>
          )}
          <Button disabled={busy} onClick={run} className="w-full btn-neon border-0">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting…</> : "Start export"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Rendered locally on your device at full quality — nothing is re-uploaded.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
