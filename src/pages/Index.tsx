import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import LoginPage from "./LoginPage";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
}

const Index = () => {
  const { user, loading } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setFetching(true);
      const [{ data: bs }, { data: es }] = await Promise.all([
        supabase.from("batches").select("id,name,description,cover_image").eq("is_published", true).order("created_at", { ascending: false }),
        supabase.from("batch_enrollments").select("batch_id").eq("user_id", user.id),
      ]);
      setBatches(bs || []);
      setEnrolled(new Set((es || []).map((e) => e.batch_id)));
      setFetching(false);
    })();
  }, [user]);

  const enroll = async (batchId: string) => {
    if (!user) return;
    const { error } = await supabase.from("batch_enrollments").insert({ batch_id: batchId, user_id: user.id });
    if (!error) setEnrolled(new Set([...enrolled, batchId]));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <LoginPage onLogin={() => window.location.reload()} />;

  return (
    <AppShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Explore Batches</h1>
        <p className="text-muted-foreground">Choose a batch to start learning</p>
      </div>
      {fetching ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : batches.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No batches available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {batches.map((b) => (
            <div key={b.id} className="bg-card rounded-2xl overflow-hidden border border-border shadow-card hover:shadow-lg transition-shadow group">
              <div className="aspect-video gradient-primary flex items-center justify-center overflow-hidden">
                {b.cover_image ? (
                  <img src={b.cover_image} alt={b.name} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-12 h-12 text-primary-foreground/80" />
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg mb-1 line-clamp-1">{b.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">{b.description || "No description"}</p>
                {enrolled.has(b.id) ? (
                  <Link to={`/batch/${b.id}`}>
                    <Button className="w-full gap-2">Open <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                ) : (
                  <Button onClick={() => enroll(b.id)} variant="outline" className="w-full">Enroll Now</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Index;
