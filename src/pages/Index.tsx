import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { TiltCard } from "@/components/TiltCard";
import { useOrderNotifications, requestNotificationPermission } from "@/hooks/useOrderNotifications";
import LoginPage from "./LoginPage";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, MapPin, Phone, Package, IndianRupee, ArrowRight, Bell, BellRing } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  items_summary: string;
  total: number;
  payout: number;
  status: string;
  created_at: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [isDelivery, setIsDelivery] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );

  useOrderNotifications(!!user && isDelivery);

  const load = async () => {
    setFetching(true);
    const { data } = await supabase
      .from("orders")
      .select("id,customer_name,customer_phone,address,items_summary,total,payout,status,created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
    setFetching(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "delivery").maybeSingle()
      .then(({ data }) => setIsDelivery(!!data));
    load();
    const ch = supabase
      .channel("orders-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const accept = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "assigned", assigned_to: user.id })
      .eq("id", id)
      .eq("status", "pending");
    if (!error) load();
  };

  const enableNotifs = async () => {
    const p = await requestNotificationPermission();
    setNotifPerm(p as NotificationPermission);
    if (p === "granted") toast.success("Notifications on! Naye orders ka alert milega.");
    else if (p === "denied") toast.error("Permission denied. Browser settings me allow karo.");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <LoginPage onLogin={() => window.location.reload()} />;

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1">Available Orders</h1>
          <p className="text-muted-foreground">Naye orders accept karke earn karo</p>
        </div>
        {isDelivery && notifPerm !== "granted" && notifPerm !== "unsupported" && (
          <Button onClick={enableNotifs} variant="outline" className="gap-2">
            <Bell className="w-4 h-4" /> Enable alerts
          </Button>
        )}
        {notifPerm === "granted" && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <BellRing className="w-3.5 h-3.5" /> Alerts on
          </div>
        )}
      </div>

      {!isDelivery && (
        <div className="mb-6 p-4 rounded-xl border border-border bg-card">
          <p className="text-sm">Aapka account abhi <b>Delivery Partner</b> nahi hai. Admin se request karo activation ke liye, ya admin ho to <Link to="/admin" className="text-primary underline">Admin panel</Link> me khud role assign karo.</p>
        </div>
      )}

      {fetching ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          Abhi koi pending order nahi hai. Thodi der baad check karo.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2" style={{ perspective: 1200 }}>
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
            >
              <TiltCard className="p-5 h-full">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{o.customer_name}</h3>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-primary font-bold text-lg"><IndianRupee className="w-4 h-4" />{o.payout}</div>
                    <p className="text-[10px] text-muted-foreground">payout</p>
                  </div>
                </div>
                <p className="text-sm mb-2 flex gap-2"><Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />{o.items_summary}</p>
                <p className="text-sm mb-2 flex gap-2"><MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />{o.address}</p>
                <p className="text-sm mb-4 flex gap-2 items-center"><Phone className="w-4 h-4 text-muted-foreground" />{o.customer_phone}</p>
                <Button className="w-full gap-2" onClick={() => accept(o.id)} disabled={!isDelivery}>
                  Accept Order <ArrowRight className="w-4 h-4" />
                </Button>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
};

export default Index;
