import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StudioProvider, useStudio } from "@/lib/studio/store";
import { TimelineDoc, emptyDoc, makeClip } from "@/lib/studio/types";
import { Preview } from "@/components/studio/Preview";
import { Timeline } from "@/components/studio/Timeline";
import { Inspector } from "@/components/studio/Inspector";
import { MediaPanel } from "@/components/studio/MediaPanel";
import { ExportDialog } from "@/components/studio/ExportDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Cloud, Loader2, Pause, Play, Redo2, SkipBack, SkipForward, Undo2 } from "lucide-react";

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}.${String(Math.floor((t % 1) * 100)).padStart(2, "0")}`;

const Shell = ({ projectId, userId, title }: { projectId: string; userId: string; title: string }) => {
  const { playing, setPlaying, time, setTime, duration, undo, redo, canUndo, canRedo, saving, doc } = useStudio();
  const nav = useNavigate();
  const frame = 1 / (doc.fps || 30);

  return (
    <div className="min-h-screen p-3 md:p-4 space-y-3">
      <header className="glass rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="ghost" onClick={() => nav("/dashboard")}><ArrowLeft className="w-4 h-4" /></Button>
        <span className="font-display font-semibold truncate max-w-[30vw]">{title}</span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> saving</> : <><Cloud className="w-3 h-3" /> saved</>}
        </span>
        <div className="mx-auto flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={!canUndo} onClick={undo}><Undo2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" disabled={!canRedo} onClick={redo}><Redo2 className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setTime(Math.max(0, time - frame))}><SkipBack className="w-4 h-4" /></Button>
          <Button size="sm" className="gradient-primary text-white border-0" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTime(Math.min(duration, time + frame))}><SkipForward className="w-4 h-4" /></Button>
          <span className="text-xs tabular-nums ml-2 text-muted-foreground">{fmt(time)} / {fmt(duration)}</span>
        </div>
        <ExportDialog />
      </header>

      <div className="grid lg:grid-cols-[280px_1fr_320px] gap-3">
        <MediaPanel projectId={projectId} userId={userId} />
        <div className="space-y-3">
          <Preview />
        </div>
        <Inspector />
      </div>

      <Timeline />
    </div>
  );
};

const Studio = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [doc, setDoc] = useState<TimelineDoc | null>(null);
  const [title, setTitle] = useState("Untitled project");

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (!data) { nav("/dashboard"); return; }
      setTitle(data.title || "Untitled project");
      if (data.timeline) { setDoc(data.timeline as unknown as TimelineDoc); return; }
      const base = emptyDoc(data.width || 1920, data.height || 1080, data.fps || 30);
      if (data.video_path) {
        const { data: s } = await supabase.storage.from("videos").createSignedUrl(data.video_path, 60 * 60 * 8);
        if (s?.signedUrl) {
          base.tracks[0].clips.push(makeClip({
            kind: "video", name: data.title || "Video", src: s.signedUrl,
            duration: data.duration_sec || 10, sourceDuration: data.duration_sec || undefined,
          }));
        }
      }
      setDoc(base);
    })();
  }, [user, id, nav]);

  if (loading || !doc || !user || !id)
    return <div className="min-h-screen grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <StudioProvider projectId={id} initialDoc={doc}>
      <Shell projectId={id} userId={user.id} title={title} />
    </StudioProvider>
  );
};

export default Studio;
