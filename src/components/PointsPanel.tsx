import { useEffect, useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { usePoints } from "@/hooks/usePoints";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Sparkles, Gift, Users, Copy, Share2 } from "lucide-react";

export const PointsPanel = () => {
  const { points, refresh } = usePoints();
  const [history, setHistory] = useState<any[]>([]);
  const [refCount, setRefCount] = useState(0);
  const [code, setCode] = useState("");

  const load = async () => {
    const [{ data: tx }, { count }] = await Promise.all([
      supabase.from("point_transactions" as any).select("*").order("created_at", { ascending: false }).limit(6),
      supabase.from("referrals" as any).select("*", { count: "exact", head: true }),
    ]);
    setHistory((tx as any[]) || []);
    setRefCount(count || 0);
  };
  useEffect(() => { load(); }, [points?.balance]);

  if (!points) return null;

  const link = `${window.location.origin}/auth?ref=${points.referral_code || ""}`;

  const claimRefill = async () => {
    const { error } = await supabase.rpc("claim_refill_points" as any);
    if (error) return toast.error(error.message);
    toast.success(`+${points.refill_amount} points claimed ✦`);
    refresh();
  };

  const applyCode = async () => {
    if (!code.trim()) return;
    const { error } = await supabase.rpc("apply_referral_code" as any, { _code: code.trim() });
    if (error) return toast.error(error.message);
    toast.success("Referral code applied — your friend earns points when you buy a plan.");
    setCode("");
  };

  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: "Captra AI", text: "Get free caption points!", url: link }); return; } catch { /* cancelled */ } }
    navigator.clipboard.writeText(link); toast.success("Invite link copied");
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <GlassCard className="relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Your points</p>
            <motion.p key={points.balance} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="font-display text-4xl font-bold gradient-text neon-text mt-1">{points.balance}</motion.p>
            <p className="text-xs text-muted-foreground mt-1">
              {points.video_cost} points per video · ~{Math.floor(points.balance / Math.max(points.video_cost, 1))} videos left
            </p>
          </div>
          <Sparkles className="w-6 h-6 text-accent pulse-soft" />
        </div>

        {points.can_claim_refill && (
          <Button onClick={claimRefill} className="w-full mt-4 btn-neon border-0">
            <Gift className="w-4 h-4 mr-2" />Claim {points.refill_amount} {points.refill_period} points
          </Button>
        )}

        {history.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border/50 space-y-1.5">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{String(h.reason).replace(/_/g, " ")}</span>
                <span className={h.delta > 0 ? "text-accent" : "text-muted-foreground"}>{h.delta > 0 ? "+" : ""}{h.delta}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <p className="font-display font-semibold">Refer & earn</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Share your code. When a friend buys any plan, you get <span className="text-foreground font-semibold">{points.referral_points} points</span>.
        </p>

        <div className="mt-3 flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary/40 border border-white/10">
          <code className="text-lg font-display tracking-widest text-primary">{points.referral_code || "—"}</code>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(points.referral_code || ""); toast.success("Code copied"); }}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={share}><Share2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Friends invited: <span className="text-foreground font-semibold">{refCount}</span></p>

        <div className="mt-4 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1">Got a friend's code?</p>
          <div className="flex gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="ENTER CODE" className="bg-secondary/50" />
            <Button variant="outline" onClick={applyCode}>Apply</Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
