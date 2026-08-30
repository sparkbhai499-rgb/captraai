import { TextCfg } from "./types";

export interface CaptionTemplate {
  id: string;
  label: string;
  /** Preview words shown in the template thumbnail. */
  sample: string;
  cfg: Partial<TextCfg>;
}

const base: Partial<TextCfg> = {
  font: "Space Grotesk",
  weight: 800,
  align: "center",
  lineHeight: 1.1,
  letterSpacing: 0,
  animation: "word",
  karaoke: true,
  uppercase: true,
};

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: "classic", label: "Classic", sample: "Watch this",
    cfg: { ...base, color: "#ffffff", highlight: "#ffffff", highlightBg: "transparent", stroke: "#000000", strokeWidth: 6, shadow: 0.5, glow: 0 },
  },
  {
    id: "hormozi", label: "Hormozi", sample: "Every single",
    cfg: { ...base, color: "#ffffff", highlight: "#ffe600", highlightBg: "transparent", stroke: "#000000", strokeWidth: 8, shadow: 0.6, glow: 0, popScale: 1.18 },
  },
  {
    id: "boxed", label: "Boxed", sample: "This is simple",
    cfg: { ...base, color: "#ffffff", highlight: "#000000", highlightBg: "#ffe600", stroke: "#000000", strokeWidth: 5, shadow: 0.4, glow: 0 },
  },
  {
    id: "neon", label: "Neon glow", sample: "Next level",
    cfg: { ...base, color: "#ffffff", highlight: "#00e5ff", highlightBg: "transparent", stroke: "#001018", strokeWidth: 3, shadow: 0.2, glow: 1 },
  },
  {
    id: "mint", label: "Mint pop", sample: "Captions",
    cfg: { ...base, color: "#ffffff", highlight: "#3dff9e", highlightBg: "transparent", stroke: "#00301c", strokeWidth: 5, shadow: 0.4, glow: 0.5, popScale: 1.15 },
  },
  {
    id: "candy", label: "Candy", sample: "Caption",
    cfg: { ...base, color: "#ffffff", highlight: "#ff3fb4", highlightBg: "transparent", stroke: "#2b0018", strokeWidth: 6, shadow: 0.45, glow: 0.7 },
  },
  {
    id: "sunset", label: "Sunset", sample: "Real estate",
    cfg: { ...base, color: "#ffd9a8", highlight: "#ff8a1a", highlightBg: "transparent", stroke: "#1a0a00", strokeWidth: 6, shadow: 0.5, glow: 0.4 },
  },
  {
    id: "master", label: "Master", sample: "Turn 1 idea",
    cfg: { ...base, color: "#ffffff", highlight: "#ffffff", highlightBg: "#7c3aed", stroke: "#000000", strokeWidth: 3, shadow: 0.35, glow: 0 },
  },
  {
    id: "cook", label: "Cook", sample: "Cook",
    cfg: { ...base, color: "#ff2d2d", highlight: "#ffffff", highlightBg: "#ff2d2d", stroke: "#000000", strokeWidth: 5, shadow: 0.4, glow: 0 },
  },
  {
    id: "sample", label: "Sample", sample: "Sample",
    cfg: { ...base, color: "#ffffff", highlight: "#ffe600", highlightBg: "transparent", stroke: "#000000", strokeWidth: 10, shadow: 0.7, glow: 0, popScale: 1.25 },
  },
  {
    id: "clean", label: "Clean", sample: "No caption",
    cfg: { ...base, uppercase: false, weight: 600, color: "#ffffff", highlight: "#ffffff", highlightBg: "rgba(0,0,0,0.55)", stroke: "#000000", strokeWidth: 0, shadow: 0.3, glow: 0, karaoke: false },
  },
  {
    id: "spark", label: "Spark", sample: "Spark",
    cfg: { ...base, color: "#ffffff", highlight: "#a78bfa", highlightBg: "transparent", stroke: "#0b0018", strokeWidth: 4, shadow: 0.35, glow: 1, popScale: 1.2 },
  },
];
