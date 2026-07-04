import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { GlassCard } from "@/components/GlassCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Video, Loader2, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

const Projects = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);

  const load = () => supabase.from("projects").select("*").order("created_at", { ascending: false }).then(({data}) => setProjects(data || []));
  useEffect(() => { if (user) load(); }, [user]);

  const remove = async (id: string, path?: string) => {
    if (!confirm("Delete this project?")) return;
    if (path) await supabase.storage.from("videos").remove([path]);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  if (loading || !user) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;

  const filtered = projects.filter(p => p.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-28 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="font-display text-3xl font-bold">All Projects</h1>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
            <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-secondary/50 w-64"/>
          </div>
        </div>

        {filtered.length === 0 ? (
          <GlassCard className="text-center py-16">
            <p className="text-muted-foreground">No projects found.</p>
            <Button className="mt-4 gradient-primary text-white border-0" asChild><Link to="/dashboard">Upload a video</Link></Button>
          </GlassCard>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} transition={{delay: Math.min(i*0.03, 0.3)}}>
                <GlassCard className="h-full flex flex-col">
                  <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-3">
                    <Video className="w-10 h-10 text-white/60"/>
                  </div>
                  <p className="font-medium truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()} · {p.status}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 gradient-primary text-white border-0" asChild><Link to={`/editor/${p.id}`}>Open</Link></Button>
                    <Button size="sm" variant="outline" onClick={() => remove(p.id, p.video_path)}><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
