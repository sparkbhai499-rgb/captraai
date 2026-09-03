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
import { ArrowLeft, Cloud, Loader2 } from "lucide-react";
...
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
