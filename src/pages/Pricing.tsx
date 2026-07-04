import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const Pricing = () => {
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => { supabase.from("plans").select("*").order("sort_order").then(({data}) => setPlans(data || [])); }, []);

  return (
    <div className="min-h-screen">
      <Navbar />
      <section className="container pt-32 pb-16">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Choose your plan</h1>
          <p className="text-muted-foreground">Start free. Scale when you grow. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {plans.map((p) => (
            <GlassCard key={p.id} className={`relative ${p.is_popular ? "border-primary glow" : ""}`}>
              {p.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-primary text-white text-xs px-3 py-1 rounded-full font-medium">Most Popular</div>}
              <h3 className="font-display text-2xl font-bold">{p.name}</h3>
              <div className="my-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-bold">₹{p.price_inr}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{p.minutes_included} minutes included</p>
              <ul className="space-y-2 mb-6 text-sm">
                {(p.features||[]).map((f: string) => <li key={f} className="flex gap-2"><Check className="w-4 h-4 text-primary shrink-0 mt-0.5"/>{f}</li>)}
              </ul>
              <Button className={`w-full ${p.is_popular ? "gradient-primary text-white border-0" : ""}`} variant={p.is_popular ? "default" : "outline"} asChild>
                <Link to="/auth">Get {p.name}</Link>
              </Button>
            </GlassCard>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Pricing;
