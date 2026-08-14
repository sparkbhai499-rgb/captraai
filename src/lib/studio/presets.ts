import { Adjust, Clip, KfProp, Keyframe } from "./types";

export const FILTERS: { id: string; label: string; css: (i: number) => string; overlay?: string }[] = [
  { id: "none", label: "Original", css: () => "" },
  { id: "cinematic", label: "Cinematic", css: (i) => `contrast(${1 + 0.28 * i}) saturate(${1 + 0.18 * i}) brightness(${1 - 0.05 * i}) hue-rotate(${-6 * i}deg)` },
  { id: "vintage", label: "Vintage", css: (i) => `sepia(${0.45 * i}) contrast(${1 + 0.12 * i}) saturate(${1 - 0.2 * i}) brightness(${1 + 0.05 * i})` },
  { id: "warm", label: "Warm", css: (i) => `sepia(${0.22 * i}) saturate(${1 + 0.25 * i}) hue-rotate(${-10 * i}deg) brightness(${1 + 0.04 * i})` },
  { id: "cold", label: "Cold", css: (i) => `saturate(${1 + 0.1 * i}) hue-rotate(${14 * i}deg) brightness(${1 + 0.03 * i}) contrast(${1 + 0.08 * i})` },
  { id: "hdr", label: "HDR", css: (i) => `contrast(${1 + 0.45 * i}) saturate(${1 + 0.4 * i}) brightness(${1 + 0.06 * i})` },
  { id: "bw", label: "B & W", css: (i) => `grayscale(${i}) contrast(${1 + 0.2 * i})` },
  { id: "portrait", label: "Portrait", css: (i) => `saturate(${1 + 0.12 * i}) contrast(${1 + 0.08 * i}) brightness(${1 + 0.08 * i}) sepia(${0.08 * i})` },
  { id: "noir", label: "Noir", css: (i) => `grayscale(${i}) contrast(${1 + 0.6 * i}) brightness(${1 - 0.1 * i})` },
  { id: "fade", label: "Faded", css: (i) => `contrast(${1 - 0.2 * i}) saturate(${1 - 0.25 * i}) brightness(${1 + 0.12 * i})` },
];

export const EFFECTS: { id: string; label: string; icon?: string }[] = [
  { id: "glitch", label: "Glitch" },
  { id: "vhs", label: "VHS" },
  { id: "rgb", label: "RGB Split" },
  { id: "shake", label: "Shake" },
  { id: "flash", label: "Flash" },
  { id: "neon", label: "Neon Glow" },
  { id: "motionblur", label: "Motion Blur" },
  { id: "grain", label: "Film Grain" },
  { id: "leak", label: "Light Leak" },
  { id: "lens", label: "Lens Flare" },
  { id: "zoompulse", label: "Zoom Pulse" },
  { id: "vignette", label: "Vignette" },
];

export const TRANSITIONS = [
  "none", "fade", "zoom", "slide", "push", "spin", "blur", "glitch", "flash", "3d", "camera",
] as const;

export const BLEND_MODES = ["normal", "multiply", "screen", "overlay", "soft-light", "hard-light", "difference", "lighten", "darken", "color-dodge"];

export const FONTS = ["Space Grotesk", "Inter", "Impact", "Georgia", "Courier New", "Arial Black", "Trebuchet MS", "Verdana"];

export const STICKERS = [
  "🔥", "✨", "😂", "😍", "💯", "🎉", "👏", "🚀", "❤️", "⭐", "😎", "🤯", "👀", "💥", "🎯", "🏆",
  "➡️", "⬆️", "✅", "❌", "❓", "❗", "💬", "📌", "🎵", "📈", "💡", "⚡", "🌈", "🎬", "🔔", "👍",
];

export const SPEEDS = [0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10];

/* ---------- keyframes ---------- */
export const kfValue = (kfs: Keyframe[] | undefined, t: number, fallback: number) => {
  if (!kfs || kfs.length === 0) return fallback;
  const s = [...kfs].sort((a, b) => a.t - b.t);
  if (t <= s[0].t) return s[0].v;
  if (t >= s[s.length - 1].t) return s[s.length - 1].v;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i], b = s[i + 1];
    if (t >= a.t && t <= b.t) {
      const p = (t - a.t) / Math.max(0.0001, b.t - a.t);
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease-in-out
      return a.v + (b.v - a.v) * e;
    }
  }
  return fallback;
};

export const prop = (clip: Clip, name: KfProp, local: number, fallback: number) =>
  kfValue(clip.keyframes[name], local, fallback);

/* ---------- css builders ---------- */
export const adjustCss = (a: Adjust) => {
  const parts: string[] = [];
  if (a.brightness || a.exposure) parts.push(`brightness(${1 + (a.brightness + a.exposure * 1.2) / 100})`);
  if (a.contrast) parts.push(`contrast(${1 + a.contrast / 100})`);
  if (a.saturation) parts.push(`saturate(${1 + a.saturation / 100})`);
  if (a.temperature) parts.push(`sepia(${Math.max(0, a.temperature) / 200}) hue-rotate(${-a.temperature / 6}deg)`);
  if (a.tint) parts.push(`hue-rotate(${a.tint / 4}deg)`);
  if (a.highlights) parts.push(`brightness(${1 + a.highlights / 400})`);
  if (a.shadows) parts.push(`contrast(${1 - a.shadows / 400})`);
  if (a.blur) parts.push(`blur(${a.blur / 12}px)`);
  return parts.join(" ");
};

export const filterCss = (clip: Clip, localTime: number) => {
  const f = FILTERS.find((x) => x.id === clip.filter);
  const base = f ? f.css(clip.filterIntensity) : "";
  const adj = adjustCss(clip.adjust);
  const kfBlur = clip.keyframes.blur ? `blur(${kfValue(clip.keyframes.blur, localTime, 0)}px)` : "";
  const fx = clip.effects
    .filter((e) => localTime >= e.start && localTime <= e.start + e.duration)
    .map((e) => {
      const k = e.intensity;
      switch (e.type) {
        case "vhs": return `saturate(${1 + 0.5 * k}) contrast(${1 + 0.25 * k}) hue-rotate(${4 * k}deg)`;
        case "neon": return `saturate(${1 + 1.2 * k}) contrast(${1 + 0.4 * k})`;
        case "motionblur": return `blur(${1.6 * k}px)`;
        case "flash": {
          const p = (localTime - e.start) / Math.max(0.001, e.duration);
          return `brightness(${1 + 1.6 * k * Math.max(0, 1 - p * 2)})`;
        }
        case "glitch": return `contrast(${1 + 0.3 * k}) saturate(${1 + 0.6 * k})`;
        default: return "";
      }
    });
  return [base, adj, kfBlur, ...fx].filter(Boolean).join(" ");
};

export const maskCss = (clip: Clip) => {
  const m = clip.mask;
  if (m.type === "none") return undefined;
  const f = Math.max(0.5, m.feather);
  let img = "";
  if (m.type === "circle") img = `radial-gradient(ellipse ${m.w / 2}% ${m.h / 2}% at ${m.x}% ${m.y}%, #000 ${100 - f}%, transparent 100%)`;
  else if (m.type === "rect") img = `linear-gradient(#000,#000) ${m.x - m.w / 2}% ${m.y - m.h / 2}% / ${m.w}% ${m.h}% no-repeat`;
  else img = `linear-gradient(${m.angle}deg, transparent 0%, #000 ${f}%, #000 ${100 - f}%, transparent 100%)`;
  return m.invert ? `${img}` : img;
};

export const transitionProgress = (clip: Clip, localTime: number) => {
  const tr = clip.transitionIn;
  if (!tr || tr.type === "none" || tr.duration <= 0) return null;
  if (localTime > tr.duration) return null;
  return Math.min(1, Math.max(0, localTime / tr.duration));
};

export const effectOffsets = (clip: Clip, localTime: number) => {
  let dx = 0, dy = 0, extraScale = 1, rot = 0;
  for (const e of clip.effects) {
    if (localTime < e.start || localTime > e.start + e.duration) continue;
    const t = localTime * 1000;
    if (e.type === "shake") { dx += Math.sin(t / 33) * 9 * e.intensity; dy += Math.cos(t / 27) * 7 * e.intensity; }
    if (e.type === "glitch") { dx += (Math.random() - 0.5) * 10 * e.intensity; }
    if (e.type === "zoompulse") { extraScale *= 1 + 0.06 * e.intensity * Math.sin(localTime * 6); }
    if (e.type === "vhs") { dy += Math.sin(t / 90) * 2 * e.intensity; rot += Math.sin(t / 400) * 0.3 * e.intensity; }
  }
  return { dx, dy, extraScale, rot };
};
