import { Clip, TimelineDoc } from "./types";
import { effectOffsets, filterCss, prop } from "./presets";

/** Media element cache used by the canvas exporter. */
export class MediaPool {
  private videos = new Map<string, HTMLVideoElement>();
  private images = new Map<string, HTMLImageElement>();

  async preload(doc: TimelineDoc) {
    const jobs: Promise<void>[] = [];
    for (const t of doc.tracks) for (const c of t.clips) {
      if (!c.src) continue;
      if (c.kind === "video") {
        if (this.videos.has(c.id)) continue;
        const v = document.createElement("video");
        v.src = c.src; v.crossOrigin = "anonymous"; v.muted = true; v.playsInline = true; v.preload = "auto";
        this.videos.set(c.id, v);
        jobs.push(new Promise<void>((res) => { v.onloadeddata = () => res(); v.onerror = () => res(); }));
      } else if (c.kind === "image" || c.kind === "gif") {
        if (this.images.has(c.id)) continue;
        const i = new Image(); i.crossOrigin = "anonymous"; i.src = c.src;
        this.images.set(c.id, i);
        jobs.push(new Promise<void>((res) => { i.onload = () => res(); i.onerror = () => res(); }));
      }
    }
    await Promise.all(jobs);
  }

  video = (id: string) => this.videos.get(id);
  image = (id: string) => this.images.get(id);

  async seek(clip: Clip, local: number) {
    const v = this.videos.get(clip.id);
    if (!v) return;
    const target = clip.inPoint + (clip.freeze ? 0 : local * clip.speed);
    if (Math.abs(v.currentTime - target) < 0.02) return;
    await new Promise<void>((res) => {
      const done = () => { v.removeEventListener("seeked", done); res(); };
      v.addEventListener("seeked", done);
      try { v.currentTime = Math.max(0, target); } catch { res(); }
      setTimeout(res, 220);
    });
  }
}

const drawFitted = (ctx: CanvasRenderingContext2D, el: CanvasImageSource, iw: number, ih: number, W: number, H: number) => {
  if (!iw || !ih) return;
  const s = Math.min(W / iw, H / ih);
  const w = iw * s, h = ih * s;
  ctx.drawImage(el, (W - w) / 2, (H - h) / 2, w, h);
};

export const drawFrame = (ctx: CanvasRenderingContext2D, doc: TimelineDoc, pool: MediaPool, time: number) => {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  for (const track of doc.tracks) {
    if (track.hidden) continue;
    for (const clip of track.clips) {
      if (clip.hidden || clip.kind === "audio") continue;
      if (time < clip.start || time >= clip.start + clip.duration) continue;
      const local = time - clip.start;
      const { dx, dy, extraScale, rot } = effectOffsets(clip, local);
      const opacity = prop(clip, "opacity", local, clip.transform.opacity);
      const scale = prop(clip, "scale", local, clip.transform.scale) * extraScale;
      const rotation = prop(clip, "rotation", local, clip.transform.rotation) + rot;
      const x = prop(clip, "x", local, clip.transform.x) + dx;
      const y = prop(clip, "y", local, clip.transform.y) + dy;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
      ctx.globalCompositeOperation = (clip.blend === "normal" ? "source-over" : clip.blend) as GlobalCompositeOperation;
      ctx.filter = filterCss(clip, local) || "none";
      ctx.translate(W / 2 + (x / 100) * W, H / 2 + (y / 100) * H);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(scale * (clip.transform.flipH ? -1 : 1), scale * (clip.transform.flipV ? -1 : 1));
      ctx.translate(-W / 2, -H / 2);

      if (clip.kind === "video") {
        const v = pool.video(clip.id);
        if (v && v.videoWidth) drawFitted(ctx, v, v.videoWidth, v.videoHeight, W, H);
      } else if (clip.kind === "image" || clip.kind === "gif") {
        const i = pool.image(clip.id);
        if (i && i.naturalWidth) drawFitted(ctx, i, i.naturalWidth, i.naturalHeight, W, H);
      } else if (clip.text) {
        const t = clip.text;
        let content = t.uppercase ? t.content.toUpperCase() : t.content;
        if (t.animation === "typewriter") {
          const n = Math.floor((local / Math.max(0.2, clip.duration * 0.6)) * content.length);
          content = content.slice(0, Math.max(1, n));
        }
        const size = clip.kind === "sticker" ? t.size : t.size * (H / 1080);
        ctx.font = `${t.weight} ${size}px "${t.font}", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        if (t.shadow) { ctx.shadowColor = `rgba(0,0,0,${0.9 * t.shadow})`; ctx.shadowBlur = 24 * t.shadow; ctx.shadowOffsetY = 6 * t.shadow; }

        if (t.animation === "word" && clip.kind !== "sticker") {
          const words = content.split(/\s+/).filter(Boolean);
          const per = Math.max(0.12, (clip.duration * 0.92) / Math.max(1, words.length));
          const active = Math.min(words.length - 1, Math.floor(local / per));
          const visible = t.karaoke ? words : words.filter((_, i) => local >= i * per);
          const space = ctx.measureText(" ").width;
          const widths = words.map((w) => ctx.measureText(w).width);
          const total = widths.reduce((a, b) => a + b, 0) + space * Math.max(0, words.length - 1);
          let x = W / 2 - total / 2;
          words.forEach((w, i) => {
            const shown = local >= i * per;
            const isActive = t.karaoke ? i === active : shown;
            const cx = x + widths[i] / 2;
            if (shown || !t.karaoke) {
              if (isActive && t.highlightBg && t.highlightBg !== "transparent") {
                ctx.fillStyle = t.highlightBg;
                ctx.fillRect(x - size * 0.12, H / 2 - size * 0.62, widths[i] + size * 0.24, size * 1.24);
              }
              if (t.glow) { ctx.shadowColor = t.highlight || t.color; ctx.shadowBlur = 30 * t.glow; ctx.shadowOffsetY = 0; }
              if (t.strokeWidth) { ctx.lineWidth = t.strokeWidth * 2; ctx.strokeStyle = t.stroke; ctx.lineJoin = "round"; ctx.strokeText(w, cx, H / 2); }
              ctx.fillStyle = isActive && t.highlight ? t.highlight : t.color;
              ctx.fillText(w, cx, H / 2);
            }
            x += widths[i] + space;
          });
        } else {
          const lines = content.split("\n");
          lines.forEach((line, li) => {
            const ly = H / 2 + (li - (lines.length - 1) / 2) * size * t.lineHeight;
            if (t.glow) { ctx.shadowColor = t.highlight || t.color; ctx.shadowBlur = 30 * t.glow; ctx.shadowOffsetY = 0; }
            if (t.strokeWidth) { ctx.lineWidth = t.strokeWidth * 2; ctx.strokeStyle = t.stroke; ctx.lineJoin = "round"; ctx.strokeText(line, W / 2, ly); }
            ctx.fillStyle = t.color;
            ctx.fillText(line, W / 2, ly);
          });
        }
      }

      ctx.restore();
    }
  }
};
