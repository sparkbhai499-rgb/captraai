import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/lib/studio/store";
import { Clip, Track } from "@/lib/studio/types";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Copy, Eye, EyeOff, Lock, Magnet, MousePointer2, Scissors, Trash2, Unlock, Volume2, VolumeX, ZoomIn, ZoomOut,
} from "lucide-react";

const KIND_COLOR: Record<string, string> = {
  video: "from-primary/80 to-primary/45",
  overlay: "from-sky-500/80 to-sky-500/45",
  text: "from-emerald-500/80 to-emerald-500/45",
  sticker: "from-fuchsia-500/80 to-fuchsia-500/45",
  audio: "from-amber-500/80 to-amber-500/45",
};

const tc = (t: number) => {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const TIP = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children as any}</TooltipTrigger>
    <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
  </Tooltip>
);

export const Timeline = () => {
  const {
    doc, setDoc, time, setTime, duration, selectedId, select, selectedClip,
    splitClip, removeClip, duplicateClip, moveClip, updateClip,
  } = useStudio();
  const [zoom, setZoom] = useState(60); // px per second
  const [snap, setSnap] = useState(true);
  const [hoverT, setHoverT] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const drag = useRef<any>(null);
  const scrubbing = useRef(false);

  const total = Math.max(duration + 5, 20);
  const snapPoints = () => doc.tracks.flatMap((t) => t.clips.flatMap((c) => [c.start, c.start + c.duration])).concat([0, time]);
  const applySnap = (v: number) => {
    if (!snap) return v;
    const p = snapPoints().find((s) => Math.abs(s - v) < 8 / zoom);
    return p === undefined ? v : p;
  };

  const timeAt = (clientX: number) => {
    const el = areaRef.current!;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(total, (clientX - rect.left + el.scrollLeft) / zoom));
  };

  const onRulerDown = (e: React.PointerEvent) => {
    scrubbing.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setTime(timeAt(e.clientX));
  };
  const onRulerMove = (e: React.PointerEvent) => {
    if (scrubbing.current) setTime(timeAt(e.clientX));
  };
  const onRulerUp = () => { scrubbing.current = false; };

  const onClipDown = (e: React.PointerEvent, clip: Clip, track: Track, mode: "move" | "l" | "r") => {
    e.stopPropagation();
    select(clip.id);
    if (track.locked || clip.locked) return;
    drag.current = { clip, track, mode, x0: e.clientX, start0: clip.start, dur0: clip.duration, in0: clip.inPoint, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    setHoverT(timeAt(e.clientX));
    const d = drag.current; if (!d) return;
    const dt = (e.clientX - d.x0) / zoom;
    if (Math.abs(e.clientX - d.x0) > 2) d.moved = true;
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
      updateClip(d.clip.id, { duration: Math.max(0.2, applySnap(d.start0 + d.dur0 + dt) - d.start0) }, false);
    }
  };

  const onUp = () => { drag.current = null; };

  const splitAt = (clipId: string, at: number) => splitClip(clipId, at);

  /* keyboard: S = split at playhead, arrows nudge selected clip */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!selectedId) return;
      if (e.key.toLowerCase() === "s") { e.preventDefault(); splitAt(selectedId, time); }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const step = (e.shiftKey ? 1 : 0.1) * (e.key === "ArrowLeft" ? -1 : 1);
        const c = selectedClip;
        if (c) { e.preventDefault(); updateClip(c.id, { start: Math.max(0, c.start + step) }); }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedId, selectedClip, time, updateClip]);

  /* keep the playhead in view while scrubbing / playing */
  useEffect(() => {
    const el = areaRef.current;
    if (!el || drag.current) return;
    const x = time * zoom;
    const pad = 80;
    if (x < el.scrollLeft + pad) el.scrollLeft = Math.max(0, x - pad);
    else if (x > el.scrollLeft + el.clientWidth - pad) el.scrollLeft = x - el.clientWidth + pad;
  }, [time, zoom]);

  const toggleTrack = (id: string, key: "hidden" | "locked" | "muted") =>
    setDoc((dd) => ({ ...dd, tracks: dd.tracks.map((t) => (t.id === id ? { ...t, [key]: !t[key] } : t)) }));


  const step = zoom < 30 ? 5 : zoom < 80 ? 2 : 1;
  const ticks = Math.ceil(total);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="glass neon-card rounded-xl flex flex-col overflow-hidden">
        {/* toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/5 bg-black/30">
          <TIP label="Select / drag clip">
            <Button size="icon" variant="ghost" className="h-8 w-8"><MousePointer2 className="w-4 h-4" /></Button>
          </TIP>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <TIP label="Split at playhead (S)">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!selectedClip}
              onClick={() => selectedId && splitAt(selectedId, time)}><Scissors className="w-4 h-4" /></Button>
          </TIP>
          <TIP label="Duplicate">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!selectedClip}
              onClick={() => selectedId && duplicateClip(selectedId)}><Copy className="w-4 h-4" /></Button>
          </TIP>
          <TIP label="Delete (Del)">
            <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!selectedClip}
              onClick={() => selectedId && removeClip(selectedId)}><Trash2 className="w-4 h-4" /></Button>
          </TIP>
          <div className="w-px h-5 bg-white/10 mx-1" />
          <TIP label={snap ? "Snapping on" : "Snapping off"}>
            <Button size="icon" variant={snap ? "default" : "ghost"} className="h-8 w-8"
              onClick={() => setSnap((s) => !s)}><Magnet className="w-4 h-4" /></Button>
          </TIP>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] tabular-nums text-muted-foreground hidden sm:block">
              {tc(time)} / {tc(duration)}
            </span>
            <div className="flex items-center gap-2 w-40">
              <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
              <Slider value={[zoom]} min={16} max={220} step={2} onValueChange={([v]) => setZoom(v)} />
              <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        </div>

        <div className="flex">
          {/* track headers */}
          <div className="w-28 md:w-36 shrink-0 border-r border-white/5 bg-black/20">
            <div className="h-8 border-b border-white/5" />
            {doc.tracks.map((t) => (
              <div key={t.id} className="h-16 px-2 flex flex-col justify-center gap-1 border-b border-white/5">
                <span className="text-[11px] font-medium truncate tracking-wide uppercase text-muted-foreground">{t.name}</span>
                <div className="flex gap-0.5">
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

          {/* scrollable area */}
          <div ref={areaRef} className="relative flex-1 overflow-x-auto select-none"
            onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={() => { onUp(); setHoverT(null); }}>
            <div style={{ width: total * zoom, minWidth: "100%" }} className="relative">
              {/* ruler */}
              <div className="h-8 border-b border-white/10 relative cursor-ew-resize bg-black/25"
                onPointerDown={onRulerDown} onPointerMove={onRulerMove} onPointerUp={onRulerUp}>
                {Array.from({ length: ticks + 1 }).map((_, i) => {
                  const major = i % step === 0;
                  return (
                    <div key={i} className="absolute bottom-0" style={{ left: i * zoom }}>
                      <div className={major ? "w-px h-3 bg-white/25" : "w-px h-1.5 bg-white/10"} />
                      {major && <span className="absolute -top-4 left-1 text-[10px] tabular-nums text-muted-foreground">{tc(i)}</span>}
                    </div>
                  );
                })}
                {hoverT !== null && (
                  <div className="absolute top-0 bottom-0 w-px bg-white/25 pointer-events-none" style={{ left: hoverT * zoom }} />
                )}
              </div>

              {/* tracks */}
              {doc.tracks.map((t) => (
                <div key={t.id} data-track={t.id}
                  className="h-16 relative border-b border-white/5 bg-[linear-gradient(90deg,hsl(0_0%_100%/0.02)_1px,transparent_1px)]"
                  style={{ backgroundSize: `${zoom}px 100%` }}
                  onClick={() => select(null)}>
                  {t.clips.map((c) => (
                    <div key={c.id}
                      onPointerDown={(e) => onClipDown(e, c, t, "move")}
                      onClick={(e) => { e.stopPropagation(); select(c.id); }}
                      onDoubleClick={(e) => { e.stopPropagation(); splitAt(c.id, timeAt(e.clientX)); }}
                      title="Drag to move · Double-click to split here"
                      className={`group absolute top-2 h-12 rounded-md bg-gradient-to-b ${KIND_COLOR[t.kind]} border overflow-hidden shadow-lg transition-shadow
                        ${t.locked || c.locked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}
                        ${selectedId === c.id ? "border-primary ring-2 ring-primary/70 ring-offset-1 ring-offset-background z-10" : "border-white/15 hover:border-white/40"} ${c.hidden ? "opacity-40" : ""}`}
                      style={{ left: c.start * zoom, width: Math.max(14, c.duration * zoom) }}>
                      <div onPointerDown={(e) => onClipDown(e, c, t, "l")}
                        className="absolute left-0 top-0 h-full w-2.5 cursor-ew-resize bg-black/40 hover:bg-black/60 flex items-center justify-center">
                        <div className="w-0.5 h-5 rounded bg-white/70 opacity-0 group-hover:opacity-100" />
                      </div>
                      <div onPointerDown={(e) => onClipDown(e, c, t, "r")}
                        className="absolute right-0 top-0 h-full w-2.5 cursor-ew-resize bg-black/40 hover:bg-black/60 flex items-center justify-center">
                        <div className="w-0.5 h-5 rounded bg-white/70 opacity-0 group-hover:opacity-100" />
                      </div>
                      <div className="px-3.5 pt-1 text-[11px] font-medium truncate pointer-events-none">
                        {c.kind === "text" || c.kind === "sticker" ? (c.text?.content || c.name) : c.name}
                      </div>
                      <div className="px-3.5 text-[10px] opacity-70 tabular-nums pointer-events-none">
                        {c.duration.toFixed(1)}s{c.speed !== 1 ? ` · ${c.speed}x` : ""}{c.reverse ? " · rev" : ""}
                      </div>
                      {Object.entries(c.keyframes).flatMap(([, kfs]) => kfs || []).map((k, i) => (
                        <div key={i} className="absolute bottom-0.5 w-1.5 h-1.5 rotate-45 bg-white" style={{ left: k.t * zoom }} />
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {/* playhead */}
              <div className="absolute top-0 bottom-0 w-[2px] bg-primary pointer-events-none z-20 shadow-[0_0_10px_hsl(var(--primary)/0.8)]"
                style={{ left: time * zoom }}>
                <div className="w-3.5 h-3.5 -ml-[6px] -mt-0.5 rounded-sm rotate-45 bg-primary" />
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 py-1 text-[10px] text-muted-foreground border-t border-white/5 bg-black/20">
          Drag clip = move · Edge drag = trim · Double-click clip = split at cursor · S = split at playhead · ←/→ nudge
        </div>
      </div>
    </TooltipProvider>
  );
};
