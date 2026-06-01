import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Loader2 } from "lucide-react";

const MyBatchesPage = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("batch_enrollments")
        .select("batch_id, batches(id,name,description,cover_image)")
        .eq("user_id", user.id);
      setItems((data || []).map((d: any) => d.batches).filter(Boolean));
      setLoading(false);
    })();
  }, [user]);

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">My Batches</h1>
      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> :
        items.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p>You haven't enrolled in any batch yet.</p>
            <Link to="/"><Button className="mt-4">Browse Batches</Button></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((b) => (
              <div key={b.id} className="bg-card rounded-2xl overflow-hidden border border-border shadow-card">
                <div className="aspect-video gradient-primary flex items-center justify-center">
                  {b.cover_image ? <img src={b.cover_image} alt={b.name} className="w-full h-full object-cover" /> : <BookOpen className="w-12 h-12 text-primary-foreground/80" />}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-lg mb-1">{b.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">{b.description}</p>
                  <Link to={`/batch/${b.id}`}><Button className="w-full gap-2">Open <ArrowRight className="w-4 h-4" /></Button></Link>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </AppShell>
  );
};

export default MyBatchesPage;
