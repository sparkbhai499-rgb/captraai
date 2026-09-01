import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/studio/store";
import { Clip } from "@/lib/studio/types";
import { effectOffsets, filterCss, maskCss, prop, transitionProgress } from "@/lib/studio/presets";

const activeClips = (tracks: any[], t: number) =>
  tracks.flatMap((tr: any) =>
    tr.hidden ? [] : tr.clips
      .filter((c: Clip) => !c.hidden && t >= c.start && t < c.start + c.duration)
      .map((c: Clip) => ({ clip: c, track: tr })));

const transitionStyle = (clip: Clip, local: number): React.CSSProperties => {
  const p = transitionProgress(clip, local);
  if (p === null) return {};
  const t = clip.transitionIn!.type;
  const inv = 1 - p;
  switch (t) {
    case "fade": return { opacity: p };
    case "zoom": return { transform: `scale(${0.6 + 0.4 * p})`, opacity: p };
    case "slide": return { transform: `translateX(${inv * 100}%)` };
    case "push": return { transform: `translateY(${inv * 100}%)` };
    case "spin": return { transform: `rotate(${inv * 180}deg) scale(${p})`, opacity: p };
    case "blur": return { filter: `blur(${inv * 22}px)`, opacity: p };
    case "glitch": return { transform: `translateX(${Math.sin(p * 40) * inv * 30}px)`, opacity: p };
    case "flash": return { filter: `brightness(${1 + inv * 4})`, opacity: p };
    case "3d": return { transform: `perspective(1200px) rotateY(${inv * 70}deg)`, opacity: p };
    case "camera": return { transform: `scale(${1.15 - 0.15 * p}) translateX(${inv * 8}%)`, opacity: p };
    default: return {};
  }
};

const easeOut = (p: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);

const TextLayer = ({ clip, local, docHeight }: { clip: Clip; local: number; docHeight: number }) => {
  const t = clip.text!;
  const content = t.uppercase ? t.content.toUpperCase() : t.content;
  const chars = content.split("");
  const words = content.split(/\s+/).filter(Boolean);
  const anim = t.animation;
  const glow = t.glow || 0;
  /* size is authored against a 1080p canvas — scale so captions never overflow the frame */
  const fontSize = t.size * (docHeight / 1080);
  const base: React.CSSProperties = {
    fontFamily: t.font, fontSize, color: t.color, fontWeight: t.weight,
    textAlign: t.align, letterSpacing: t.letterSpacing, lineHeight: t.lineHeight,
    WebkitTextStroke: t.strokeWidth ? `${t.strokeWidth}px ${t.stroke}` : undefined,
    paintOrder: "stroke fill" as any,
    textShadow: [
      t.shadow ? `0 ${4 * t.shadow}px ${16 * t.shadow}px rgba(0,0,0,${0.9 * t.shadow})` : "",
      glow ? `0 0 ${14 * glow}px ${t.highlight || t.color}, 0 0 ${34 * glow}px ${t.highlight || t.color}` : "",
    ].filter(Boolean).join(", ") || undefined,
    background: t.bg !== "transparent" ? t.bg : undefined,
    padding: t.bg !== "transparent" ? "0.2em 0.5em" : undefined,
    borderRadius: 12, whiteSpace: "pre-wrap", overflowWrap: "break-word",
    maxWidth: "86%", margin: "0 auto",
    willChange: "transform, opacity",
  };

  if (anim === "typewriter") {
    const n = Math.floor((local / Math.max(0.2, clip.duration * 0.6)) * chars.length);
    return <div style={base}>{content.slice(0, Math.max(1, n))}</div>;
  }
  if (anim === "word") {
    const per = Math.max(0.12, (clip.duration * 0.92) / Math.max(1, words.length));
    const active = Math.min(words.length - 1, Math.floor(local / per));
    const pop = t.popScale ?? 1.12;
    return (
      <div style={base}>
        {words.map((w, i) => {
          const p = easeOut((local - i * per) / 0.18);
          const isActive = t.karaoke ? i === active : local >= i * per;
          const shown = local >= i * per;
          const boxed = isActive && t.highlightBg && t.highlightBg !== "transparent";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                marginRight: "0.28em",
                opacity: shown ? 1 : t.karaoke ? 0 : 0.15,
                color: isActive && t.highlight ? t.highlight : undefined,
                background: boxed ? t.highlightBg : undefined,
                padding: boxed ? "0 0.16em" : undefined,
                borderRadius: boxed ? 8 : undefined,
                transform: `translateY(${(1 - p) * 14}px) scale(${shown ? (isActive ? 1 + (pop - 1) * easeOut((local - i * per) / 0.22) : 1) : 0.9})`,
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    );
  }
  if (anim === "pop") {
    const p = easeOut(local / 0.35);
    return <div style={{ ...base, transform: `scale(${0.86 + 0.14 * p + Math.sin(p * Math.PI) * 0.08})`, opacity: Math.min(1, p * 1.4) }}>{content}</div>;
  }
  if (anim === "slide") {
    const p = easeOut(local / 0.4);
    return <div style={{ ...base, transform: `translateY(${(1 - p) * 40}px)`, opacity: p }}>{content}</div>;
  }
  if (anim === "fade") return <div style={{ ...base, opacity: easeOut(local / 0.5) }}>{content}</div>;
  return <div style={base}>{content}</div>;
};


const Layer = ({ clip, time, docHeight }: { clip: Clip; time: number; docHeight: number }) => {
  const local = time - clip.start;
  const vRef = useRef<HTMLVideoElement | null>(null);
  const { playing } = useStudio();

  useEffect(() => {
    const v = vRef.current;
    if (!v) return;
    const src = clip.inPoint + (clip.freeze ? 0 : local * clip.speed);
    const target = clip.reverse ? Math.max(0, (clip.sourceDuration || clip.duration) - src) : src;
    if (Math.abs(v.currentTime - target) > 0.22) v.currentTime = target;
    v.playbackRate = Math.min(10, Math.max(0.1, clip.speed));
    v.volume = clip.audio.volume;
    if (playing && !clip.freeze && !clip.reverse) v.play().catch(() => {}); else v.pause();
  }, [local, playing, clip.speed, clip.inPoint, clip.freeze, clip.reverse, clip.audio.volume, clip.duration, clip.sourceDuration]);

  const opacityKf = prop(clip, "opacity", local, clip.transform.opacity);
  const scale = prop(clip, "scale", local, clip.transform.scale);
  const rotation = prop(clip, "rotation", local, clip.transform.rotation);
  const x = prop(clip, "x", local, clip.transform.x);
  const y = prop(clip, "y", local, clip.transform.y);
  const { dx, dy, extraScale, rot } = effectOffsets(clip, local);

  // fade in/out of audio-driven opacity is not applied to visuals
  const tr = clip.transform;
  const mask = maskCss(clip);
  const hasLeak = clip.effects.some((e) => e.type === "leak" && local >= e.start && local <= e.start + e.duration);
  const hasGrain = clip.adjust.grain > 0 || clip.effects.some((e) => e.type === "grain" && local >= e.start && local <= e.start + e.duration);
  const hasVignette = clip.effects.some((e) => e.type === "vignette" && local >= e.start && local <= e.start + e.duration);
  const rgb = clip.effects.find((e) => e.type === "rgb" && local >= e.start && local <= e.start + e.duration);
  const neon = clip.effects.find((e) => e.type === "neon" && local >= e.start && local <= e.start + e.duration);
  const lens = clip.effects.find((e) => e.type === "lens" && local >= e.start && local <= e.start + e.duration);

  const wrapStyle: React.CSSProperties = {
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    opacity: opacityKf,
    mixBlendMode: clip.blend as any,
    transform: `translate(${x + dx}%, ${y + dy}%) scale(${scale * extraScale}) rotate(${rotation + rot}deg) scaleX(${tr.flipH ? -1 : 1}) scaleY(${tr.flipV ? -1 : 1})`,
    clipPath: `inset(${tr.cropT}% ${tr.cropR}% ${tr.cropB}% ${tr.cropL}%)`,
    WebkitMaskImage: mask, maskImage: mask,
    filter: neon ? `drop-shadow(0 0 ${18 * neon.intensity}px currentColor)` : undefined,
    ...transitionStyle(clip, local),
  };

  const mediaStyle: React.CSSProperties = {
    width: "100%", height: "100%", objectFit: "contain",
    filter: filterCss(clip, local),
  };

  if (clip.kind === "audio") return null;

  return (
    <div style={wrapStyle}>
      {(clip.kind === "video") && (
        <video ref={vRef} src={clip.src} style={mediaStyle} playsInline muted={clip.audio.volume === 0} preload="auto" />
      )}
      {(clip.kind === "image" || clip.kind === "gif") && <img src={clip.src} style={mediaStyle} alt={clip.name} />}
      {clip.kind === "text" && clip.text && (
        <div style={{ filter: filterCss(clip, local), width: "100%", textAlign: "center" }}>
          <TextLayer clip={clip} local={local} docHeight={docHeight} />
        </div>
      )}
      {clip.kind === "sticker" && (
        <div style={{ fontSize: clip.text?.size || 120, lineHeight: 1 }}>{clip.text?.content || "✨"}</div>
      )}
      {rgb && (
        <>
          <div style={{ position: "absolute", inset: 0, background: "rgba(255,0,0,.25)", mixBlendMode: "screen", transform: `translateX(${6 * rgb.intensity}px)` }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,255,255,.25)", mixBlendMode: "screen", transform: `translateX(${-6 * rgb.intensity}px)` }} />
        </>
      )}
      {hasGrain && (
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.25,
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='120' height='120' filter='url(%23n)' opacity='0.6'/></svg>\")",
          backgroundSize: "160px", mixBlendMode: "overlay",
        }} />
      )}
      {hasLeak && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", background: `radial-gradient(circle at ${20 + Math.sin(local) * 10}% 30%, rgba(255,140,40,.55), transparent 55%)` }} />
      )}
      {lens && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "screen", background: `radial-gradient(circle at 70% 25%, rgba(255,255,220,${0.5 * lens.intensity}), transparent 35%)` }} />
      )}
      {hasVignette && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 0 180px 60px rgba(0,0,0,.75)" }} />}
    </div>
  );
};

const AudioLayer = ({ clip, time }: { clip: Clip; time: number }) => {
  const ref = useRef<HTMLAudioElement | null>(null);
  const { playing } = useStudio();
  const local = time - clip.start;
  useEffect(() => {
    const a = ref.current; if (!a) return;
    const target = clip.inPoint + local * clip.speed;
    if (Math.abs(a.currentTime - target) > 0.25) a.currentTime = target;
    a.playbackRate = clip.speed;
    let v = clip.audio.volume;
    if (clip.audio.fadeIn && local < clip.audio.fadeIn) v *= local / clip.audio.fadeIn;
    const toEnd = clip.duration - local;
    if (clip.audio.fadeOut && toEnd < clip.audio.fadeOut) v *= Math.max(0, toEnd / clip.audio.fadeOut);
    a.volume = Math.min(1, Math.max(0, v));
    if (playing) a.play().catch(() => {}); else a.pause();
  }, [local, playing, clip]);
  return <audio ref={ref} src={clip.src} hidden />;
};

const RATIOS = [
  { id: "9:16", label: "Reel / Shorts / TikTok", short: "9:16", w: 1080, h: 1920 },
  { id: "16:9", label: "YouTube", short: "16:9", w: 1920, h: 1080 },
  { id: "1:1", label: "Square post", short: "1:1", w: 1080, h: 1080 },
  { id: "4:5", label: "Feed portrait", short: "4:5", w: 1080, h: 1350 },
];

export const Preview = () => {
  const { doc, time, setTime, playing, setPlaying, duration, setRatio } = useStudio();
  const raf = useRef<number>();
  const last = useRef<number>(0);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!playing) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000;
      last.current = now;
      setTime(Math.min(duration, timeRef.current + dt));
      if (timeRef.current + dt >= duration) setPlaying(false);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current!);
  }, [playing, duration, setTime, setPlaying]);

  const timeRef = useRef(time);
  timeRef.current = time;

  const layers = activeClips(doc.tracks, time);
  const audio = doc.tracks.filter((t) => !t.muted).flatMap((t) => t.clips.filter((c) => c.kind === "audio" && time >= c.start && time < c.start + c.duration));

  const fit = box.w && box.h ? Math.min(box.w / doc.width, box.h / doc.height) : 0;
  const stageW = doc.width * fit;
  const stageH = doc.height * fit;
  const activeRatio = RATIOS.find((r) => r.w === doc.width && r.h === doc.height)?.id;

  return (
    <div className="space-y-2">
      <div className="glass rounded-xl px-2 py-1.5 flex items-center gap-1 flex-wrap">
        <span className="text-[11px] text-muted-foreground px-1">Ratio</span>
        {RATIOS.map((r) => (
          <button
            key={r.id}
            title={r.label}
            onClick={() => setRatio(r.w, r.h)}
            className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
              activeRatio === r.id ? "border-primary bg-primary/15 text-foreground" : "border-white/10 bg-secondary/40 text-muted-foreground hover:border-primary/50"
            }`}
          >
            {r.short}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums pr-1">{doc.width}×{doc.height} · {doc.fps}fps</span>
      </div>

      <div
        ref={boxRef}
        className="relative w-full rounded-xl overflow-hidden bg-black grid place-items-center"
        style={{ height: "min(58vh, 620px)" }}
      >
        <div
          id="studio-stage"
          className="relative overflow-hidden bg-black"
          style={{ width: stageW || 1, height: stageH || 1, contain: "paint" }}
        >
          <div
            style={{
              width: doc.width, height: doc.height,
              transform: `scale(${fit || 0.001})`, transformOrigin: "top left",
              position: "absolute", top: 0, left: 0,
            }}
          >
            {layers.map(({ clip }) => <Layer key={clip.id} clip={clip} time={time} docHeight={doc.height} />)}
          </div>
        </div>
        {layers.length === 0 && (
          <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground pointer-events-none">
            Import media to start editing
          </div>
        )}
        {audio.map((c) => <AudioLayer key={c.id} clip={c} time={time} />)}
      </div>
    </div>
  );
};
