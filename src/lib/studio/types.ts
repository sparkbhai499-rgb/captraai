export type ClipKind = "video" | "image" | "gif" | "text" | "sticker" | "audio";
export type TrackKind = "video" | "overlay" | "text" | "sticker" | "audio";

export type KfProp = "x" | "y" | "scale" | "rotation" | "opacity" | "blur" | "volume";
export interface Keyframe { t: number; v: number }

export interface Adjust {
  brightness: number; contrast: number; saturation: number; exposure: number;
  highlights: number; shadows: number; temperature: number; tint: number;
  sharpness: number; blur: number; grain: number;
}

export interface Transform {
  x: number; y: number; scale: number; rotation: number; opacity: number;
  flipH: boolean; flipV: boolean;
  cropT: number; cropR: number; cropB: number; cropL: number;
}

export interface ClipEffect {
  id: string; type: string; intensity: number; start: number; duration: number;
}

export interface MaskCfg {
  type: "none" | "circle" | "rect" | "linear";
  x: number; y: number; w: number; h: number; feather: number; invert: boolean; angle: number;
}

export interface ChromaCfg {
  enabled: boolean; color: string; threshold: number; smooth: number; spill: number; shadow: number;
}

export interface TextCfg {
  content: string; font: string; size: number; color: string; weight: number;
  stroke: string; strokeWidth: number; shadow: number; bg: string; align: "left" | "center" | "right";
  animation: "none" | "fade" | "typewriter" | "pop" | "word" | "slide";
  letterSpacing: number; lineHeight: number; curve: number;
}

export interface AudioCfg { volume: number; fadeIn: number; fadeOut: number; pitch: number; }

export interface TransitionCfg { type: string; duration: number; }

export interface Clip {
  id: string; kind: ClipKind; name: string;
  src?: string; assetId?: string;
  start: number; duration: number; inPoint: number; sourceDuration?: number;
  speed: number; reverse: boolean; freeze: boolean;
  locked: boolean; hidden: boolean;
  transform: Transform;
  blend: string;
  filter: string; filterIntensity: number;
  adjust: Adjust;
  effects: ClipEffect[];
  mask: MaskCfg;
  chroma: ChromaCfg;
  text?: TextCfg;
  audio: AudioCfg;
  transitionIn?: TransitionCfg;
  keyframes: Partial<Record<KfProp, Keyframe[]>>;
  tracking?: { enabled: boolean; targetX: number; targetY: number };
}

export interface Track {
  id: string; kind: TrackKind; name: string;
  locked: boolean; hidden: boolean; muted: boolean;
  clips: Clip[];
}

export interface TimelineDoc {
  version: 1;
  width: number; height: number; fps: number;
  tracks: Track[];
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export const defaultAdjust = (): Adjust => ({
  brightness: 0, contrast: 0, saturation: 0, exposure: 0, highlights: 0,
  shadows: 0, temperature: 0, tint: 0, sharpness: 0, blur: 0, grain: 0,
});

export const defaultTransform = (): Transform => ({
  x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, flipH: false, flipV: false,
  cropT: 0, cropR: 0, cropB: 0, cropL: 0,
});

export const defaultText = (): TextCfg => ({
  content: "Your text here", font: "Space Grotesk", size: 64, color: "#ffffff", weight: 700,
  stroke: "#000000", strokeWidth: 0, shadow: 0.4, bg: "transparent", align: "center",
  animation: "pop", letterSpacing: 0, lineHeight: 1.15, curve: 0,
});

export const makeClip = (p: Partial<Clip> & { kind: ClipKind; name: string }): Clip => ({
  id: uid(),
  start: 0, duration: 5, inPoint: 0,
  speed: 1, reverse: false, freeze: false, locked: false, hidden: false,
  transform: defaultTransform(),
  blend: "normal",
  filter: "none", filterIntensity: 1,
  adjust: defaultAdjust(),
  effects: [],
  mask: { type: "none", x: 50, y: 50, w: 60, h: 60, feather: 10, invert: false, angle: 0 },
  chroma: { enabled: false, color: "#00ff00", threshold: 0.4, smooth: 0.1, spill: 0.3, shadow: 0 },
  audio: { volume: 1, fadeIn: 0, fadeOut: 0, pitch: 0 },
  keyframes: {},
  ...p,
});

export const emptyDoc = (width = 1920, height = 1080, fps = 30): TimelineDoc => ({
  version: 1, width, height, fps,
  tracks: [
    { id: uid(), kind: "video", name: "Video", locked: false, hidden: false, muted: false, clips: [] },
    { id: uid(), kind: "overlay", name: "Overlay", locked: false, hidden: false, muted: false, clips: [] },
    { id: uid(), kind: "text", name: "Text", locked: false, hidden: false, muted: false, clips: [] },
    { id: uid(), kind: "sticker", name: "Stickers", locked: false, hidden: false, muted: false, clips: [] },
    { id: uid(), kind: "audio", name: "Audio", locked: false, hidden: false, muted: false, clips: [] },
  ],
});

export const docDuration = (doc: TimelineDoc) =>
  Math.max(1, ...doc.tracks.flatMap((t) => t.clips.map((c) => c.start + c.duration)));
