import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Gift, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePoints } from "@/hooks/usePoints";

/** Shows a celebration popup right after signup so the user can claim their welcome points. */
export const WelcomePointsDialog = () => {
  const { points, refresh } = usePoints();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (points && !points.signup_claimed) setOpen(true);
  }, [points]);

  const claim = async () => {
    setBusy(true);
    try {
      if (code.trim()) {
        const { error } = await supabase.rpc("apply_referral_code" as any, { _code: code.trim() });
        if (error) toast.error(error.message);
        else toast.success("Referral code applied ✦");
      }
      const { error } = await supabase.rpc("claim_signup_bonus" as any);
      if (error) throw error;
      setClaimed(true);
      await refresh();
      setTimeout(() => setOpen(false), 1600);
    } catch (e: any) {
      toast.error(e.message || "Could not claim points");
      setOpen(false);
    } finally { setBusy(false); }
  };

  if (!points) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) setOpen(v); }}>
      <DialogContent className="glass neon-card border-white/10 max-w-sm text-center">
        <AnimatePresence mode="wait">
          {!claimed ? (
            <motion.div key="claim" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="py-4 space-y-4">
              <motion.div
                animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
                className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto glow"
              >
                <Gift className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h2 className="font-display text-2xl font-bold gradient-text neon-text">
                  {points.signup_bonus} free points!
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Welcome gift — that's {Math.floor(points.signup_bonus / Math.max(points.video_cost, 1))} videos on us.
                  Each video costs {points.video_cost} points.
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-muted-foreground mb-1">Have a friend's referral code? (optional)</p>
                <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4" className="bg-secondary/50" />
              </div>
              <Button onClick={claim} disabled={busy} className="w-full btn-neon border-0">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Claim {points.signup_bonus} points ✦</>}
              </Button>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}>
                <Sparkles className="w-16 h-16 text-accent pulse-soft" />
              </motion.div>
              <p className="font-display text-xl font-bold mt-4 gradient-text neon-text">+{points.signup_bonus} points added</p>
              <p className="text-sm text-muted-foreground mt-1">Start creating captions right away.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
