import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Loader2, MapPin, Package, IndianRupee, CheckCircle2, Truck } from "lucide-react";

interface Order {
  id: string; customer_name: string; address: string; items_summary: string;
  total: number; payout: number; status: string; created_at: string;
}

const STATUS_STYLES: Record<string, string> = {
  assigned: "bg-amber-500/15 text-amber-600",
  picked_up: "bg-blue-500/15 text-blue-600",
  delivered: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-destructive/15 text-destructive",
};

const MyDeliveriesPage = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,customer_name,address,items_summary,total,payout,status,created_at")
        .eq("assigned_to", user.id)
        .order("created_at", { ascending: false });
      setOrders((data as Order[]) || []);
      setLoading(false);
    })();
  }, [user]);

  const active = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
  const history = orders.filter(o => o.status === "delivered" || o.status === "cancelled");
  const earnings = history.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.payout), 0);

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Deliveries</h1>
          <p className="text-muted-foreground">Active + past orders</p>
        </div>
        <div className="rounded-xl bg-primary/10 px-4 py-2 text-primary flex items-center gap-1 font-semibold">
          <IndianRupee className="w-4 h-4" />{earnings} earned
        </div>
      </div>

      {loading ? <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : (
        <>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Truck className="w-5 h-5" />Active ({active.length})</h2>
          {active.length === 0 ? <p className="text-sm text-muted-foreground mb-8">Koi active delivery nahi.</p> :
            <div className="grid gap-3 mb-8">{active.map(o => <OrderRow key={o.id} o={o} />)}</div>}

          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" />History ({history.length})</h2>
          {history.length === 0 ? <p className="text-sm text-muted-foreground">Abhi koi delivered order nahi.</p> :
            <div className="grid gap-3">{history.map(o => <OrderRow key={o.id} o={o} />)}</div>}
        </>
      )}
    </AppShell>
  );
};

const OrderRow = ({ o }: { o: Order }) => (
  <Link to={`/order/${o.id}`} className="block rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold">{o.customer_name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${STATUS_STYLES[o.status] || "bg-muted"}`}>{o.status.replace("_"," ")}</span>
        </div>
        <p className="text-sm text-muted-foreground flex gap-1 items-start"><Package className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="truncate">{o.items_summary}</span></p>
        <p className="text-sm text-muted-foreground flex gap-1 items-start"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /><span className="truncate">{o.address}</span></p>
      </div>
      <div className="text-primary font-bold flex items-center"><IndianRupee className="w-4 h-4" />{o.payout}</div>
    </div>
  </Link>
);

export default MyDeliveriesPage;
