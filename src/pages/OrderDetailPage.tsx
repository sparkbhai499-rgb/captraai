import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, MapPin, Phone, Package, IndianRupee, ArrowLeft, CheckCircle2, XCircle, Navigation } from "lucide-react";

const OrderDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    setOrder(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const markPickedUp = async () => {
    setBusy(true);
    const { error } = await supabase.from("orders")
      .update({ status: "picked_up", picked_up_at: new Date().toISOString() })
      .eq("id", id!);
    setBusy(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Picked up!", description: "Customer ke pass jao." }); load(); }
  };

  const cancelAssignment = async () => {
    if (!confirm("Order cancel karke wapas dusro ke liye available kar do?")) return;
    setBusy(true);
    const { error } = await supabase.from("orders")
      .update({ status: "pending", assigned_to: null, picked_up_at: null })
      .eq("id", id!);
    setBusy(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Order released", description: "Wapas available orders me chala gaya." });
      navigate("/my-deliveries");
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 4) { toast({ title: "4-digit OTP daalo", variant: "destructive" }); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_delivery_otp", { _order_id: id!, _otp: otp });
    setBusy(false);
    const res = data as { ok: boolean; error?: string } | null;
    if (error || !res?.ok) {
      toast({ title: "Wrong OTP", description: res?.error || error?.message || "Galat code", variant: "destructive" });
      setOtp("");
    } else {
      toast({ title: "Delivered ✓", description: "Payout aapke earnings me add ho gaya." });
      load();
    }
  };

  if (loading) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;
  if (!order) return <AppShell><p>Order not found.</p></AppShell>;

  const isMine = order.assigned_to === user?.id;

  return (
    <AppShell>
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 gap-1"><ArrowLeft className="w-4 h-4" />Back</Button>

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{order.customer_name}</h1>
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase font-semibold">{order.status.replace("_"," ")}</span>
          </div>
          <div className="text-right">
            <div className="flex items-center text-primary font-bold text-2xl"><IndianRupee className="w-5 h-5" />{order.payout}</div>
            <p className="text-xs text-muted-foreground">your payout</p>
          </div>
        </div>

        <div className="space-y-3 text-sm border-t border-border pt-4">
          <div className="flex gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /><div><div className="text-muted-foreground text-xs">Items</div>{order.items_summary}</div></div>
          <div className="flex gap-2"><MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /><div className="flex-1"><div className="text-muted-foreground text-xs">Delivery address</div>{order.address}<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary font-medium"><Navigation className="w-3 h-3" />Open in Maps</a></div></div>
          <div className="flex gap-2"><Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /><div><div className="text-muted-foreground text-xs">Customer</div><a href={`tel:${order.customer_phone}`} className="text-primary">{order.customer_phone}</a></div></div>
          <div className="flex gap-2"><IndianRupee className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" /><div><div className="text-muted-foreground text-xs">Order total</div>₹{order.total}</div></div>
        </div>
      </div>

      {isMine && order.status === "assigned" && (
        <div className="space-y-2">
          <Button className="w-full" size="lg" onClick={markPickedUp} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark as Picked Up"}
          </Button>
          <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={cancelAssignment} disabled={busy}>
            <XCircle className="w-4 h-4" />Cancel & release order
          </Button>
        </div>
      )}

      {isMine && order.status === "picked_up" && (
        <div className="rounded-2xl border-2 border-primary bg-card p-6">
          <h2 className="font-semibold mb-2">Customer se 4-digit code lo</h2>
          <p className="text-sm text-muted-foreground mb-4">Customer ke phone par jo code aaya hai woh daalo. Sahi hone par delivery automatic confirm ho jayegi.</p>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="○ ○ ○ ○"
            className="text-center text-3xl font-bold tracking-[1em] h-16 mb-4"
          />
          <Button className="w-full" size="lg" onClick={verifyOtp} disabled={busy || otp.length !== 4}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" />Verify & Deliver</>}
          </Button>
          <Button variant="ghost" className="w-full mt-2 text-destructive" onClick={cancelAssignment} disabled={busy}>
            <XCircle className="w-4 h-4" />Cancel & release order
          </Button>
        </div>
      )}

      {order.status === "delivered" && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
          <h2 className="font-semibold text-emerald-700 dark:text-emerald-400">Delivered Successfully</h2>
          <p className="text-sm text-muted-foreground mt-1">{order.delivered_at && new Date(order.delivered_at).toLocaleString()}</p>
        </div>
      )}
    </AppShell>
  );
};

export default OrderDetailPage;
