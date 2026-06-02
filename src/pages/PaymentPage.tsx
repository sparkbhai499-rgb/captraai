import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Upload, Copy, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

const PaymentPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const type = (params.get("type") as "batch" | "subscription") || "batch";
  const targetId = params.get("id") || "";

  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [existing, setExisting] = useState<any>(null);
  const [utr, setUtr] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || !targetId) return;
    (async () => {
      setLoading(true);
      const tbl = type === "batch" ? "batches" : "subscription_plans";
      const [{ data: t }, { data: s }, { data: e }] = await Promise.all([
        supabase.from(tbl).select("*").eq("id", targetId).maybeSingle(),
        supabase.from("payment_settings").select("*").limit(1).maybeSingle(),
        supabase.from("payment_requests").select("*")
          .eq("user_id", user.id)
          .eq(type === "batch" ? "batch_id" : "plan_id", targetId)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setTarget(t); setSettings(s); setExisting(e);
      setLoading(false);
    })();
  }, [user, targetId, type]);

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copied!"); };

  const submit = async () => {
    if (!user || !target || !file || !utr.trim()) { toast.error("Upload screenshot and enter UTR"); return; }
    setSubmitting(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, file);
    if (upErr) { toast.error(upErr.message); setSubmitting(false); return; }
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id, type, amount: target.price, utr: utr.trim(), screenshot_path: path,
      batch_id: type === "batch" ? targetId : null,
      plan_id: type === "subscription" ? targetId : null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Payment submitted! Admin will verify and activate access shortly.");
    navigate(type === "batch" ? `/batch/${targetId}` : "/subscriptions");
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;
  if (!target) return <AppShell><p>Not found.</p></AppShell>;

  return (
    <AppShell>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
          <p className="text-sm text-muted-foreground mb-1">{type === "batch" ? "Batch" : "Subscription Plan"}</p>
          <h1 className="text-2xl font-bold">{target.name}</h1>
          <p className="text-3xl font-bold text-primary mt-3">₹{target.price}</p>
          {type === "subscription" && <p className="text-sm text-muted-foreground mt-1">Valid for {target.duration_days} days · Access to ALL batches</p>}
        </div>

        {existing && existing.status === "pending" && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Payment under review</p>
              <p className="text-sm text-muted-foreground mt-1">UTR: {existing.utr}. Admin will approve soon.</p>
            </div>
          </div>
        )}
        {existing && existing.status === "approved" && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-semibold text-emerald-900 dark:text-emerald-200">Payment approved! Access granted.</p>
          </div>
        )}

        {(!existing || existing.status === "rejected") && (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card">
              <h2 className="font-semibold mb-4">Step 1 · Pay with UPI / QR</h2>
              {settings?.qr_image_url && (
                <div className="flex justify-center mb-4">
                  <img src={settings.qr_image_url} alt="UPI QR" className="w-56 h-56 object-contain rounded-xl border border-border bg-white p-2" />
                </div>
              )}
              {settings?.upi_id && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <div>
                    <p className="text-xs text-muted-foreground">UPI ID</p>
                    <p className="font-mono font-semibold">{settings.upi_id}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copy(settings.upi_id)} className="gap-1.5"><Copy className="w-3.5 h-3.5" />Copy</Button>
                </div>
              )}
              {!settings?.qr_image_url && !settings?.upi_id && (
                <p className="text-sm text-muted-foreground">Admin has not configured payment yet.</p>
              )}
              {settings?.instructions && <p className="text-sm text-muted-foreground mt-3">{settings.instructions}</p>}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-3">
              <h2 className="font-semibold">Step 2 · Submit payment proof</h2>
              <div>
                <label className="text-sm font-medium">UTR / Transaction ID</label>
                <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 412345678901" className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Payment screenshot</label>
                <Input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1" />
              </div>
              <Button onClick={submit} disabled={submitting} className="w-full gap-1.5">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" />Submit for verification</>}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default PaymentPage;
