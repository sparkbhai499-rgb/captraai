import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Clip, TimelineDoc, Track, docDuration, emptyDoc, uid } from "./types";
import { supabase } from "@/integrations/supabase/client";

type Ctx = {
  doc: TimelineDoc;
  setDoc: (updater: (d: TimelineDoc) => TimelineDoc, commit?: boolean) => void;
  selectedId: string | null;
  select: (id: string | null) => void;
  selectedClip: Clip | null;
  updateClip: (id: string, patch: Partial<Clip> | ((c: Clip) => Partial<Clip>), commit?: boolean) => void;
  addClip: (trackKind: Track["kind"], clip: Clip) => void;
  removeClip: (id: string) => void;
  duplicateClip: (id: string) => void;
  splitClip: (id: string, at: number) => void;
  moveClip: (id: string, toTrackId: string, start: number) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  duration: number;
  time: number;
  setTime: (t: number) => void;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  saving: boolean;
};

const StudioCtx = createContext<Ctx | null>(null);
export const useStudio = () => {
  const c = useContext(StudioCtx);
  if (!c) throw new Error("useStudio outside provider");
  return c;
};

export const findClip = (doc: TimelineDoc, id: string | null) => {
  if (!id) return null;
  for (const t of doc.tracks) { const c = t.clips.find((x) => x.id === id); if (c) return c; }
  return null;
};

export const trackOfClip = (doc: TimelineDoc, id: string) => doc.tracks.find((t) => t.clips.some((c) => c.id === id));

export const StudioProvider = ({ projectId, initialDoc, children }:
  { projectId: string; initialDoc: TimelineDoc; children: React.ReactNode }) => {
  const [doc, setDocState] = useState<TimelineDoc>(initialDoc);
  const [past, setPast] = useState<TimelineDoc[]>([]);
  const [future, setFuture] = useState<TimelineDoc[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<any>(null);
  const firstRun = useRef(true);

  const setDoc = useCallback((updater: (d: TimelineDoc) => TimelineDoc, commit = true) => {
    setDocState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      if (commit) { setPast((p) => [...p.slice(-49), prev]); setFuture([]); }
      return next;
    });
  }, []);

  /* autosave — non-destructive project state */
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      await supabase.from("projects").update({ timeline: doc as any }).eq("id", projectId);
      setSaving(false);
    }, 900);
    return () => clearTimeout(saveTimer.current);
  }, [doc, projectId]);

  const updateClip: Ctx["updateClip"] = useCallback((id, patch, commit = true) => {
    setDoc((d) => ({
      ...d,
      tracks: d.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)),
      })),
    }), commit);
  }, [setDoc]);

  const addClip: Ctx["addClip"] = useCallback((trackKind, clip) => {
    setDoc((d) => {
      const idx = d.tracks.findIndex((t) => t.kind === trackKind);
      if (idx < 0) return d;
      const tracks = d.tracks.map((t, i) => (i === idx ? { ...t, clips: [...t.clips, clip] } : t));
      return { ...d, tracks };
    });
    setSelectedId(clip.id);
  }, [setDoc]);

  const removeClip = useCallback((id: string) => {
    setDoc((d) => ({ ...d, tracks: d.tracks.map((t) => ({ ...t, clips: t.clips.filter((c) => c.id !== id) })) }));
    setSelectedId((s) => (s === id ? null : s));
  }, [setDoc]);

  const duplicateClip = useCallback((id: string) => {
    setDoc((d) => ({
      ...d,
      tracks: d.tracks.map((t) => {
        const c = t.clips.find((x) => x.id === id);
        if (!c) return t;
        return { ...t, clips: [...t.clips, { ...c, id: uid(), start: c.start + c.duration }] };
      }),
    }));
  }, [setDoc]);

  const splitClip = useCallback((id: string, at: number) => {
    setDoc((d) => ({
      ...d,
      tracks: d.tracks.map((t) => {
        const c = t.clips.find((x) => x.id === id);
        if (!c) return t;
        const local = at - c.start;
        if (local <= 0.05 || local >= c.duration - 0.05) return t;
        const left: Clip = { ...c, duration: local };
        const right: Clip = {
          ...c, id: uid(), start: c.start + local, duration: c.duration - local,
          inPoint: c.inPoint + local * c.speed, transitionIn: undefined,
        };
        return { ...t, clips: [...t.clips.filter((x) => x.id !== id), left, right] };
      }),
    }));
  }, [setDoc]);

  const moveClip = useCallback((id: string, toTrackId: string, start: number) => {
    setDoc((d) => {
      let moving: Clip | undefined;
      const stripped = d.tracks.map((t) => {
        const c = t.clips.find((x) => x.id === id);
        if (c) moving = c;
        return { ...t, clips: t.clips.filter((x) => x.id !== id) };
      });
      if (!moving) return d;
      const m = { ...moving, start: Math.max(0, start) };
      return { ...d, tracks: stripped.map((t) => (t.id === toTrackId ? { ...t, clips: [...t.clips, m] } : t)) };
    });
  }, [setDoc]);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setDocState((cur) => { setFuture((f) => [cur, ...f]); return prev; });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setDocState((cur) => { setPast((p) => [...p, cur]); return next; });
      return f.slice(1);
    });
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === "Delete" && selectedId) removeClip(selectedId);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, selectedId, removeClip]);

  const value = useMemo<Ctx>(() => ({
    doc, setDoc, selectedId, select: setSelectedId, selectedClip: findClip(doc, selectedId),
    updateClip, addClip, removeClip, duplicateClip, splitClip, moveClip,
    undo, redo, canUndo: past.length > 0, canRedo: future.length > 0,
    duration: docDuration(doc), time, setTime, playing, setPlaying, saving,
  }), [doc, setDoc, selectedId, updateClip, addClip, removeClip, duplicateClip, splitClip, moveClip, undo, redo, past.length, future.length, time, playing, saving]);

  return <StudioCtx.Provider value={value}>{children}</StudioCtx.Provider>;
};

export { emptyDoc };
