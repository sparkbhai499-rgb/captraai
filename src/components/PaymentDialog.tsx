import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Copy, Upload, ArrowLeft, CheckCircle2, QrCode, Smartphone } from "lucide-react";

const UPI_APPS = [
  { id: "phonepe", name: "PhonePe", color: "from-[#5f259f] to-[#7d3cc7]", scheme: (q: string) => `phonepe://pay?${q}` },
  { id: "paytm", name: "Paytm", color: "from-[#00baf2] to-[#0a5aa8]", scheme: (q: string) => `paytmmp://pay?${q}` },
  { id: "gpay", name: "Google Pay", color: "from-[#1a73e8] to-[#34a853]", scheme: (q: string) => `tez://upi/pay?${q}` },
  { id: "bhim", name: "BHIM UPI", color: "from-[#ff8a1a] to-[#ff5722]", scheme: (q: string) => `bhim://pay?${q}` },
  { id: "other", name: "Other UPI apps", color: "from-zinc-600 to-zinc-800", scheme: (q: string) => `upi://pay?${q}` },
];

export const PaymentDialog = ({ plan, open, onOpenChange }: { plan: any; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"pay" | "submit" | "done">("pay");
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (!open) return;
    setStep("pay");
    supabase.from("payment_settings" as any).select("*").limit(1).maybeSingle().then(({ data }) => setSettings(data));
  }, [open]);

  const upiId = settings?.upi_id || "captraai@upi";
  const upiName = settings?.upi_name || "Captra AI";
  const amount = plan?.price_inr ?? 0;
  const query = new URLSearchParams({
    pa: upiId, pn: upiName, am: String(amount), cu: "INR",
    tn: `${plan?.name || "Plan"} subscription`,
  }).toString();

  const openApp = (url: string) => {
    window.location.href = url;
    // when the user comes back from the UPI app, show the submit step
    setTimeout(() => setStep("submit"), 800);
  };

  // Also flip to submit step when the tab becomes visible again after paying
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && open && step === "pay") setStep("submit"); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [open, step]);

  const submit = async () => {
    if (!user) { nav("/auth"); return; }
    if (!ref.trim()) return toast.error("Enter UPI transaction / reference ID");
    if (!file) return toast.error("Upload payment screenshot");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("payment_requests").insert({
        user_id: user.id, plan_id: plan.id, amount_inr: plan.price_inr,
        upi_ref: ref.trim(), screenshot_path: path, status: "pending",
      });
      if (error) throw error;
      setStep("done");
      setTimeout(() => {
        toast.success("Payment submitted! Admin will approve shortly.");
        onOpenChange(false); setRef(""); setFile(null); setStep("pay");
        nav("/dashboard");
      }, 1800);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            {step === "submit" && (
              <button onClick={() => setStep("pay")} className="hover:text-primary"><ArrowLeft className="w-4 h-4"/></button>
            )}
            Pay for {plan?.name}
          </DialogTitle>
          <DialogDescription>
            {step === "pay" ? `Pay ₹${amount} using any UPI app, then come back to submit.` : "Almost done — share your payment details."}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "pay" && (
            <motion.div key="pay" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              {settings?.qr_url && (
                <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 rounded-xl bg-white flex flex-col items-center">
                  <img src={settings.qr_url} alt={`UPI QR code to pay ${upiName}`} className="w-48 h-48 object-contain" />
                  <p className="text-xs text-black/60 mt-2 flex items-center gap-1"><QrCode className="w-3 h-3"/>Scan to pay ₹{amount}</p>
                </motion.div>
              )}

              <div className="p-4 rounded-xl bg-secondary/40 border border-white/10">
                <p className="text-xs text-muted-foreground">Pay to</p>
                <p className="font-display text-lg font-semibold">{upiName}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <code className="text-sm text-primary">{upiId}</code>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(upiId); toast.success("Copied"); }}>
                    <Copy className="w-3.5 h-3.5"/>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Amount: <span className="text-foreground font-semibold">₹{amount}</span></p>
                {settings?.note && <p className="text-xs text-muted-foreground mt-1">{settings.note}</p>}
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Smartphone className="w-3.5 h-3.5"/>Choose your UPI app</p>
                <div className="grid grid-cols-2 gap-2">
                  {UPI_APPS.map((a, i) => (
                    <motion.button
                      key={a.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.03 }}
                      onClick={() => openApp(a.scheme(query))}
                      className={`bg-gradient-to-br ${a.color} text-white rounded-xl py-3 px-3 text-sm font-medium shadow-lg`}
                    >
                      {a.name}
                    </motion.button>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setStep("submit")}>
                Already paid → Submit proof
              </Button>
            </motion.div>
          )}

          {step === "submit" && (
            <motion.div key="submit" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-4">
              <div>
                <Label className="text-xs">UPI Transaction / Reference ID</Label>
                <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. 123456789012" className="bg-secondary/50 mt-1"/>
              </div>
              <div>
                <Label className="text-xs">Payment Screenshot</Label>
                <label className="mt-1 flex items-center gap-2 p-3 rounded-lg border border-dashed border-white/10 bg-secondary/30 cursor-pointer hover:border-primary/50">
                  <Upload className="w-4 h-4 text-primary"/>
                  <span className="text-sm truncate">{file?.name || "Choose image"}</span>
                  <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </div>
              <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-white border-0">
                {busy ? <Loader2 className="w-4 h-4 animate-spin"/> : "Submit for approval"}
              </Button>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-10 flex flex-col items-center text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 12 }}>
                <CheckCircle2 className="w-16 h-16 text-green-400"/>
              </motion.div>
              <p className="font-display text-xl font-bold mt-4">Payment submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">Admin approval ke baad plan activate ho jayega.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
