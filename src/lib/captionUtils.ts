export type Caption = { idx: number; start_ms: number; end_ms: number; text: string };

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const fmt = (ms: number, sep = ",") => {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const mss = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(mss, 3)}`;
};

export const toSRT = (caps: Caption[]) =>
  caps.map((c, i) => `${i + 1}\n${fmt(c.start_ms)} --> ${fmt(c.end_ms)}\n${c.text.trim()}\n`).join("\n");

export const toVTT = (caps: Caption[]) =>
  `WEBVTT\n\n${caps.map((c) => `${fmt(c.start_ms, ".")} --> ${fmt(c.end_ms, ".")}\n${c.text.trim()}\n`).join("\n")}`;

export const toTXT = (caps: Caption[]) => caps.map((c) => c.text.trim()).join(" ");

export const download = (content: string, filename: string, mime = "text/plain") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
