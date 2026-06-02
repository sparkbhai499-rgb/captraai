import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Loader2, Crown, Check } from "lucide-react";

const SubscriptionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [mySub, setMySub] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: s }] = await Promise.all([
        supabase.from("subscription_plans").select("*").eq("is_active", true).order("price"),
        supabase.from("user_subscriptions").select("*, subscription_plans(name)")
          .eq("user_id", user.id).gt("expires_at", new Date().toISOString())
          .order("expires_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setPlans(p || []); setMySub(s); setLoading(false);
    })();
  }, [user]);

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;

  return (
    <AppShell>
      <div className="mb-8 text-center">
        <Crown className="w-10 h-10 text-primary mx-auto mb-3" />
        <h1 className="text-3xl font-bold mb-1">All-Access Subscription</h1>
        <p className="text-muted-foreground">Unlock every batch on StudyHub with one plan</p>
      </div>

      {mySub && (
        <div className="max-w-xl mx-auto mb-8 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 text-center">
          <p className="font-semibold text-emerald-900 dark:text-emerald-200">✓ Active: {mySub.subscription_plans?.name}</p>
          <p className="text-sm text-muted-foreground mt-1">Valid until {new Date(mySub.expires_at).toLocaleDateString()}</p>
        </div>
      )}

      {plans.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No subscription plans available yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-2xl p-6 shadow-card flex flex-col">
              <h3 className="font-bold text-xl">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4 min-h-[2.5rem]">{p.description}</p>
              <p className="text-4xl font-bold text-primary">₹{p.price}</p>
              <p className="text-sm text-muted-foreground mt-1">for {p.duration_days} days</p>
              <ul className="mt-4 space-y-1.5 text-sm flex-1">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />All current batches</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />All new batches added</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" />PDFs · Videos · Notes</li>
              </ul>
              <Button onClick={() => navigate(`/pay?type=subscription&id=${p.id}`)} className="w-full mt-5">Subscribe</Button>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default SubscriptionsPage;
