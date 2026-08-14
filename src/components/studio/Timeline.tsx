import { useRef, useState } from "react";
import { useStudio } from "@/lib/studio/store";
import { Clip, Track } from "@/lib/studio/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Copy, Eye, EyeOff, Lock, Magnet, Scissors, Trash2, Unlock, Volume2, VolumeX, ZoomIn, ZoomOut,
} from "lucide-react";

const KIND_COLOR: Record<string, string> = {
  video: "from-primary/70 to-primary/40",
  overlay: "from-sky-500/70 to-sky-500/40",
  text: "from-emerald-500/70 to-emerald-500/40",
  sticker: "from-fuchsia-500/70 to-fuchsia-500/40",
  audio: "from-amber-500/70 to-amber-500/40",
};

export const Timeline = () => {
  const {
    doc, setDoc, time, setTime, duration, selectedId, select, selectedClip,
    splitClip, removeClip, duplicateClip, moveClip, updateClip,
  } = useStudio();
  const [zoom, setZoom] = useState(60); // px per second
  const [snap, setSnap] = useState(true);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<any>(null);

  const total = Math.max(duration + 5, 20);
  const snapPoints = () => doc.tracks.flatMap((t) => t.clips.flatMap((c) => [c.start, c.start + c.duration])).concat([0, time]);
  const applySnap = (v: number) => {
    if (!snap) return v;
    const p = snapPoints().find((s) => Math.abs(s - v) < 8 / zoom);
    return p === undefined ? v : p;
  };

  const scrub = (e: React.MouseEvent) => {
    const rect = areaRef.current!.getBoundingClientRect();
    const t = (e.clientX - rect.left + areaRef.current!.scrollLeft) / zoom;
    setTime(Math.max(0, Math.min(total, t)));
  };

  const onClipDown = (e: React.PointerEvent, clip: Clip, track: Track, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    if (track.locked || clip.locked) return;
    select(clip.id);
    drag.current = { clip, track, mode, x0: e.clientX, start0: clip.start, dur0: clip.duration, in0: clip.inPoint };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dt = (e.clientX - d.x0) / zoom;
    if (d.mode === "move") {
      const rows = Array.from(areaRef.current!.querySelectorAll("[data-track]")) as HTMLElement[];
      const hit = rows.find((r) => { const b = r.getBoundingClientRect(); return e.clientY >= b.top && e.clientY <= b.bottom; });
      const trackId = hit?.dataset.track || d.track.id;
      moveClip(d.clip.id, trackId, applySnap(Math.max(0, d.start0 + dt)));
    } else if (d.mode === "l") {
      const ns = Math.max(0, d.start0 + dt);
      const nd = Math.max(0.2, d.dur0 - (ns - d.start0));
      updateClip(d.clip.id, { start: applySnap(ns), duration: nd, inPoint: Math.max(0, d.in0 + (ns - d.start0)) }, false);
    } else {
      updateClip(d.clip.id, { duration: Math.max(0.2, d.dur0 + dt) }, false);
    }
  };

  const onUp = () => { drag.current = null; };

  const toggleTrack = (id: string, key: "hidden" | "locked" | "muted") =>
    setDoc((dd) => ({ ...dd, tracks: dd.tracks.map((t) => (t.id === id ? { ...t, [key]: !t[key] } : t)) }));

  const ticks = Math.ceil(total);

  return (
    <div className="glass rounded-xl flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
        <Button size="sm" variant="secondary" disabled={!selectedClip} onClick={() => selectedId && splitClip(selectedId, time)}>
          <Scissors className="w-4 h-4 mr-1" /> Split
        </Button>
        <Button size="sm" variant="secondary" disabled={!selectedClip} onClick={() => selectedId && duplicateClip(selectedId)}>
          <Copy className="w-4 h-4 mr-1" /> Duplicate
        </Button>
        <Button size="sm" variant="secondary" disabled={!selectedClip} onClick={() => selectedId && removeClip(selectedId)}>
          <Trash2 className="w-4 h-4 mr-1" /> Delete
        </Button>
        <Button size="sm" variant={snap ? "default" : "secondary"} onClick={() => setSnap((s) => !s)}>
          <Magnet className="w-4 h-4 mr-1" /> Snap
        </Button>
        <div className="ml-auto flex items-center gap-2 w-44">
          <ZoomOut className="w-4 h-4 text-muted-foreground" />
          <Slider value={[zoom]} min={16} max={220} step={2} onValueChange={([v]) => setZoom(v)} />
          <ZoomIn className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex">
        <div className="w-32 shrink-0 border-r border-white/5">
          <div className="h-7 border-b border-white/5" />
          {doc.tracks.map((t) => (
            <div key={t.id} className="h-16 px-2 flex flex-col justify-center gap-1 border-b border-white/5">
              <span className="text-xs font-medium truncate">{t.name}</span>
              <div className="flex gap-1">
                <button onClick={() => toggleTrack(t.id, "hidden")} className="p-1 rounded hover:bg-white/10">
                  {t.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => toggleTrack(t.id, "locked")} className="p-1 rounded hover:bg-white/10">
                  {t.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => toggleTrack(t.id, "muted")} className="p-1 rounded hover:bg-white/10">
                  {t.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div ref={areaRef} className="relative flex-1 overflow-x-auto select-none"
          onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
          <div style={{ width: total * zoom, minWidth: "100%" }} className="relative">
            <div className="h-7 border-b border-white/5 relative cursor-pointer" onClick={scrub}>
              {Array.from({ length: ticks + 1 }).map((_, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-white/10 text-[10px] text-muted-foreground pl-1"
                  style={{ left: i * zoom }}>{i % (zoom < 40 ? 5 : 1) === 0 ? `${i}s` : ""}</div>
              ))}
            </div>

            {doc.tracks.map((t) => (
              <div key={t.id} data-track={t.id} className="h-16 relative border-b border-white/5" onClick={() => select(null)}>
                {t.clips.map((c) => (
                  <div key={c.id}
                    onPointerDown={(e) => onClipDown(e, c, t, "move")}
                    onClick={(e) => { e.stopPropagation(); select(c.id); }}
                    className={`absolute top-2 h-12 rounded-lg bg-gradient-to-b ${KIND_COLOR[t.kind]} border cursor-grab active:cursor-grabbing overflow-hidden
                      ${selectedId === c.id ? "border-white ring-2 ring-primary" : "border-white/20"} ${c.hidden ? "opacity-40" : ""}`}
                    style={{ left: c.start * zoom, width: Math.max(14, c.duration * zoom) }}>
                    <div onPointerDown={(e) => onClipDown(e, c, t, "l")} className="absolute left-0 top-0 h-full w-2 cursor-ew-resize bg-black/30" />
                    <div onPointerDown={(e) => onClipDown(e, c, t, "r")} className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-black/30" />
                    <div className="px-3 py-1 text-[11px] font-medium truncate pointer-events-none">
                      {c.kind === "text" || c.kind === "sticker" ? (c.text?.content || c.name) : c.name}
                    </div>
                    <div className="px-3 text-[10px] opacity-70 pointer-events-none">
                      {c.duration.toFixed(1)}s{c.speed !== 1 ? ` · ${c.speed}x` : ""}{c.reverse ? " · rev" : ""}
                    </div>
                    {Object.entries(c.keyframes).flatMap(([, kfs]) => kfs || []).map((k, i) => (
                      <div key={i} className="absolute bottom-0.5 w-1.5 h-1.5 rotate-45 bg-white" style={{ left: k.t * zoom }} />
                    ))}
                  </div>
                ))}
              </div>
            ))}

            <div className="absolute top-0 bottom-0 w-0.5 bg-primary pointer-events-none" style={{ left: time * zoom }}>
              <div className="w-3 h-3 -ml-[5px] rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
