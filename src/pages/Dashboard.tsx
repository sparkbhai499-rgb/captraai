import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { UploadDropzone } from "@/components/UploadDropzone";
import { GlassCard } from "@/components/GlassCard";
import { motion } from "framer-motion";
import { Video, Clock, CheckCircle2, XCircle, Loader2, FolderOpen } from "lucide-react";

const statusMap: Record<string, { icon: any; color: string; label: string }> = {
  uploaded: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  transcribing: { icon: Loader2, color: "text-accent animate-spin", label: "Transcribing" },
  ready: { icon: CheckCircle2, color: "text-primary", label: "Ready" },
  failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
};

const Dashboard = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    const load = () => supabase.from("projects").select("*").order("created_at", { ascending: false }).limit(6).then(({data}) => setProjects(data || []));
    load();
    const ch = supabase.channel("proj-dash").on("postgres_changes", { event: "*", schema: "public", table: "projects" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;

  const totalMins = Math.round(projects.reduce((a, p) => a + (p.duration_sec || 0), 0) / 60);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-28 pb-16">
        <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold">Welcome back 👋</h1>
          <p className="text-muted-foreground mt-1">Upload a video to generate captions, or continue an existing project.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <GlassCard><p className="text-xs text-muted-foreground">Total projects</p><p className="font-display text-3xl font-bold mt-1">{projects.length}</p></GlassCard>
          <GlassCard><p className="text-xs text-muted-foreground">Minutes processed</p><p className="font-display text-3xl font-bold mt-1">{totalMins}</p></GlassCard>
          <GlassCard><p className="text-xs text-muted-foreground">Plan</p><p className="font-display text-xl font-bold mt-1 gradient-text">Free · 15 min/mo</p></GlassCard>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            <UploadDropzone />
          </div>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold">Recent projects</h2>
              <Link to="/projects" className="text-sm text-primary hover:underline">See all →</Link>
            </div>
            {projects.length === 0 ? (
              <GlassCard className="text-center py-14">
                <FolderOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3"/>
                <p className="text-muted-foreground text-sm">No projects yet — upload your first video!</p>
              </GlassCard>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {projects.map((p) => {
                  const S = statusMap[p.status] || statusMap.uploaded;
                  return (
                    <Link key={p.id} to={`/editor/${p.id}`}>
                      <GlassCard className="hover:border-primary/50 transition cursor-pointer h-full">
                        <div className="flex items-start gap-3">
                          <div className="w-11 h-11 rounded-lg gradient-primary flex items-center justify-center shrink-0"><Video className="w-5 h-5 text-white"/></div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{p.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                            <div className={`flex items-center gap-1 mt-2 text-xs ${S.color}`}>
                              <S.icon className={`w-3.5 h-3.5 ${p.status === "transcribing" ? "animate-spin" : ""}`}/> {S.label}
                            </div>
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
