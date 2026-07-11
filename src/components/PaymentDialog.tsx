import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, Upload } from "lucide-react";

const UPI_ID = "captraai@upi";
const UPI_NAME = "CaptraAI";

export const PaymentDialog = ({ plan, open, onOpenChange }: { plan: any; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [ref, setRef] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

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
      toast.success("Payment submitted! Admin will approve shortly.");
      onOpenChange(false); setRef(""); setFile(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Pay for {plan?.name}</DialogTitle>
          <DialogDescription>Pay ₹{plan?.price_inr} via UPI and upload the screenshot.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary/40 border border-white/10">
            <p className="text-xs text-muted-foreground">Pay to</p>
            <p className="font-display text-lg font-semibold">{UPI_NAME}</p>
            <div className="flex items-center justify-between mt-2 gap-2">
              <code className="text-sm text-primary">{UPI_ID}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(UPI_ID); toast.success("Copied"); }}>
                <Copy className="w-3.5 h-3.5"/>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Amount: <span className="text-foreground font-semibold">₹{plan?.price_inr}</span></p>
          </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};
