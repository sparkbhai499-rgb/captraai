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
    id: "sample", label: "Impact", sample: "Sample",
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

  /* ---- new pack ---- */
  {
    id: "podcast", label: "Podcast", sample: "Real talk",
    cfg: { ...base, uppercase: false, weight: 700, color: "#ffffff", highlight: "#ffffff", highlightBg: "rgba(20,20,20,0.8)", stroke: "#000000", strokeWidth: 0, shadow: 0.25, glow: 0, popScale: 1.06 },
  },
  {
    id: "fire", label: "Fire", sample: "Go viral",
    cfg: { ...base, color: "#fff3c4", highlight: "#ff4d00", highlightBg: "transparent", stroke: "#180400", strokeWidth: 7, shadow: 0.5, glow: 0.9, popScale: 1.22 },
  },
  {
    id: "ice", label: "Ice", sample: "Cold facts",
    cfg: { ...base, color: "#eaf9ff", highlight: "#7fd8ff", highlightBg: "transparent", stroke: "#02243a", strokeWidth: 5, shadow: 0.35, glow: 0.8 },
  },
  {
    id: "gold", label: "Gold", sample: "Premium",
    cfg: { ...base, color: "#fff6d5", highlight: "#ffc531", highlightBg: "transparent", stroke: "#241700", strokeWidth: 6, shadow: 0.5, glow: 0.6, popScale: 1.14 },
  },
  {
    id: "money", label: "Money", sample: "10k month",
    cfg: { ...base, color: "#ffffff", highlight: "#0b1f0d", highlightBg: "#33ff66", stroke: "#00220a", strokeWidth: 4, shadow: 0.4, glow: 0.3 },
  },
  {
    id: "tiktok", label: "TikTok", sample: "For you",
    cfg: { ...base, uppercase: false, weight: 800, color: "#ffffff", highlight: "#ff2f56", highlightBg: "transparent", stroke: "#000000", strokeWidth: 5, shadow: 0.45, glow: 0.35 },
  },
  {
    id: "shorts", label: "Shorts", sample: "Watch till end",
    cfg: { ...base, color: "#ffffff", highlight: "#ffffff", highlightBg: "#ff0033", stroke: "#000000", strokeWidth: 3, shadow: 0.4, glow: 0, popScale: 1.12 },
  },
  {
    id: "vlog", label: "Vlog", sample: "Day one",
    cfg: { ...base, uppercase: false, weight: 600, font: "Inter", color: "#ffffff", highlight: "#ffd166", highlightBg: "transparent", stroke: "#000000", strokeWidth: 2, shadow: 0.5, glow: 0.2, popScale: 1.05 },
  },
  {
    id: "cinema", label: "Cinema", sample: "The story",
    cfg: { ...base, uppercase: true, weight: 500, letterSpacing: 3, color: "#f4f4f4", highlight: "#f4f4f4", highlightBg: "transparent", stroke: "#000000", strokeWidth: 0, shadow: 0.6, glow: 0, karaoke: false, animation: "fade" },
  },
  {
    id: "retro", label: "Retro", sample: "Rewind",
    cfg: { ...base, color: "#ffe9c7", highlight: "#ff6b6b", highlightBg: "transparent", stroke: "#2a0d3a", strokeWidth: 7, shadow: 0.4, glow: 0.5 },
  },
  {
    id: "vhs", label: "VHS", sample: "Play tape",
    cfg: { ...base, letterSpacing: 2, color: "#c9ffe8", highlight: "#ff00d4", highlightBg: "transparent", stroke: "#00121a", strokeWidth: 4, shadow: 0.3, glow: 0.9 },
  },
  {
    id: "meme", label: "Meme", sample: "Bro really",
    cfg: { ...base, color: "#ffffff", highlight: "#ffffff", highlightBg: "transparent", stroke: "#000000", strokeWidth: 12, shadow: 0.2, glow: 0, popScale: 1.1, karaoke: false },
  },
  {
    id: "news", label: "News", sample: "Breaking",
    cfg: { ...base, weight: 700, color: "#ffffff", highlight: "#ffffff", highlightBg: "#0047ff", stroke: "#000018", strokeWidth: 0, shadow: 0.3, glow: 0, popScale: 1.04 },
  },
  {
    id: "sports", label: "Sports", sample: "Beast mode",
    cfg: { ...base, weight: 900, letterSpacing: -1, color: "#ffffff", highlight: "#00ff88", highlightBg: "transparent", stroke: "#001a0d", strokeWidth: 9, shadow: 0.5, glow: 0.4, popScale: 1.2 },
  },
  {
    id: "luxury", label: "Luxury", sample: "Elite life",
    cfg: { ...base, uppercase: true, weight: 400, letterSpacing: 6, color: "#ffffff", highlight: "#d4af37", highlightBg: "transparent", stroke: "#000000", strokeWidth: 0, shadow: 0.5, glow: 0.3, animation: "fade", karaoke: false },
  },
  {
    id: "bubble", label: "Bubble", sample: "So cute",
    cfg: { ...base, uppercase: false, weight: 800, color: "#ffffff", highlight: "#ffffff", highlightBg: "#ff86c8", stroke: "#7a0040", strokeWidth: 5, shadow: 0.35, glow: 0.3, popScale: 1.18 },
  },
  {
    id: "hindi", label: "Hindi bold", sample: "आज का सच",
    cfg: { ...base, uppercase: false, weight: 800, color: "#ffffff", highlight: "#ffcc00", highlightBg: "transparent", stroke: "#000000", strokeWidth: 7, shadow: 0.5, glow: 0.2, popScale: 1.16 },
  },
  {
    id: "typer", label: "Typewriter", sample: "Loading...",
    cfg: { ...base, uppercase: false, weight: 600, letterSpacing: 1, color: "#e9ffe9", highlight: "#7CFF6B", highlightBg: "transparent", stroke: "#001400", strokeWidth: 2, shadow: 0.3, glow: 0.6, animation: "typewriter", karaoke: false },
  },
  {
    id: "slidein", label: "Slide up", sample: "Watch now",
    cfg: { ...base, uppercase: false, weight: 700, color: "#ffffff", highlight: "#8ab4ff", highlightBg: "transparent", stroke: "#000814", strokeWidth: 3, shadow: 0.4, glow: 0.3, animation: "slide", karaoke: false },
  },
  {
    id: "outline", label: "Outline", sample: "Bold edge",
    cfg: { ...base, color: "transparent", highlight: "#ffffff", highlightBg: "transparent", stroke: "#ffffff", strokeWidth: 3, shadow: 0.2, glow: 0.2 },
  },
];
