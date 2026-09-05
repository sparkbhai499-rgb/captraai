import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Pricing = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [myPending, setMyPending] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("plans").select("*").order("sort_order").then(({ data }) => setPlans(data || []));
  }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("payment_requests").select("*,plans(name)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5)
      .then(({ data }) => setMyPending(data || []));
  }, [user]);

  const onBuy = (p: any) => {
    if (!user) return nav("/auth");
    if (p.price_inr === 0) return toast.info("You're already on Free.");
    setSelected(p);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container pt-32 pb-16">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Choose your plan</h1>
          <p className="text-muted-foreground">Free includes 5 videos. Upgrade for more.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((p) => (
            <GlassCard key={p.id} className={`relative flex flex-col ${p.is_popular ? "border-primary glow" : ""}`}>
              {p.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-white text-xs px-3 py-1 rounded-full font-medium">Most Popular</div>}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <div className="my-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">₹{p.price_inr}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{p.minutes_included} minutes included</p>
              <ul className="space-y-2 mb-6 text-sm flex-1">
                {(p.features || []).map((f: string) => <li key={f} className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5"/>{f}</li>)}
              </ul>
              <Button onClick={() => onBuy(p)} className={`w-full ${p.is_popular ? "btn-neon border-0" : ""}`} variant={p.is_popular ? "default" : "outline"}>
                {p.price_inr === 0 ? "Current" : `Buy ${p.name}`}
              </Button>
            </GlassCard>
          ))}
        </div>

        {myPending.length > 0 && (
          <div className="max-w-3xl mx-auto mt-12">
            <h2 className="font-display text-xl font-bold mb-3">Your payments</h2>
            <GlassCard className="space-y-2">
              {myPending.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div>
                    <p className="font-medium">{r.plans?.name} — ₹{r.amount_inr}</p>
                    <p className="text-xs text-muted-foreground">Ref: {r.upi_ref}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${r.status === "approved" ? "bg-green-500/20 text-green-400" : r.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </GlassCard>
          </div>
        )}
      </section>
      {selected && <PaymentDialog plan={selected} open={!!selected} onOpenChange={(v) => !v && setSelected(null)} />}
      <Footer />
    </div>
  );
};

export default Pricing;
