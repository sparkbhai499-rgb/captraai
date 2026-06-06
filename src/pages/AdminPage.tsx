import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";

const AdminPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [partnerEmail, setPartnerEmail] = useState("");

  // new order form
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", address: "", items_summary: "", total: "", payout: "40", delivery_otp: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); if (!data) navigate("/"); });
  }, [user]);

  const loadAll = async () => {
    const [{ data: o }, { data: p }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_roles").select("user_id,role").eq("role", "delivery"),
    ]);
    setOrders(o || []);
    // join with profiles
    if (p && p.length) {
      const ids = p.map((r: any) => r.user_id);
      const { data: pr } = await supabase.from("profiles").select("user_id,display_name,phone").in("user_id", ids);
      setPartners(pr || []);
    } else setPartners([]);
  };

  useEffect(() => { if (isAdmin) loadAll(); }, [isAdmin]);

  const createOrder = async () => {
    if (!/^\d{4}$/.test(form.delivery_otp)) {
      toast({ title: "OTP zaroori", description: "4-digit delivery OTP daalo", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("orders").insert({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      address: form.address,
      items_summary: form.items_summary,
      total: Number(form.total) || 0,
      payout: Number(form.payout) || 40,
      delivery_otp: form.delivery_otp,
    });
    setCreating(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Order created" });
      setForm({ customer_name: "", customer_phone: "", address: "", items_summary: "", total: "", payout: "40", delivery_otp: "" });
      loadAll();
    }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm("Cancel this order?")) return;
    await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
    loadAll();
  };

  const grantDelivery = async () => {
    if (!partnerEmail) return;
    // find user by email via profiles? profiles doesn't store email. Use auth not available client-side.
    // Workaround: ask for phone instead and look up profile by phone
    const { data: prof } = await supabase.from("profiles").select("user_id").eq("phone", partnerEmail).maybeSingle();
    if (!prof) { toast({ title: "User not found", description: "Iss phone se koi user signed up nahi hai", variant: "destructive" }); return; }
    const { error } = await supabase.from("user_roles").insert({ user_id: prof.user_id, role: "delivery" as any });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Delivery role granted" }); setPartnerEmail(""); loadAll(); }
  };

  const revokeDelivery = async (uid: string) => {
    await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "delivery" as any);
    loadAll();
  };

  if (loading || isAdmin === null) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;
  if (!isAdmin) return null;

  return (
    <AppShell>
      <h1 className="text-3xl font-bold mb-6">Admin</h1>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="new">+ New Order</TabsTrigger>
          <TabsTrigger value="partners">Delivery Partners</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>OTP</TableHead><TableHead>Total</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {orders.map(o => (
                <TableRow key={o.id}>
                  <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.customer_phone}</div></TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{o.items_summary}</TableCell>
                  <TableCell><span className="text-xs px-2 py-0.5 bg-muted rounded-full">{o.status}</span></TableCell>
                  <TableCell className="font-mono">{o.delivery_otp}</TableCell>
                  <TableCell>₹{o.total}</TableCell>
                  <TableCell>{o.status !== "delivered" && o.status !== "cancelled" && (
                    <Button variant="ghost" size="icon" onClick={() => cancelOrder(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  )}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="new" className="mt-6 max-w-xl space-y-3">
          <Input placeholder="Customer name" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} />
          <Input placeholder="Customer phone" value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})} />
          <Textarea placeholder="Delivery address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} />
          <Textarea placeholder="Items (e.g. 2x Saree, 1x Kurti)" value={form.items_summary} onChange={e=>setForm({...form,items_summary:e.target.value})} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder="Order total ₹" value={form.total} onChange={e=>setForm({...form,total:e.target.value})} />
            <Input type="number" placeholder="Delivery payout ₹" value={form.payout} onChange={e=>setForm({...form,payout:e.target.value})} />
          </div>
          <Button onClick={createOrder} disabled={creating || !form.customer_name || !form.customer_phone || !form.address}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Create Order</>}
          </Button>
          <p className="text-xs text-muted-foreground">Note: Sellnix app se aane wale orders automatically yahan dikh jayenge agar dono apps same backend share karte hai.</p>
        </TabsContent>

        <TabsContent value="partners" className="mt-6 space-y-6">
          <div className="flex gap-2 max-w-md">
            <Input placeholder="Partner ka phone number (jaisa signup me diya tha)" value={partnerEmail} onChange={e=>setPartnerEmail(e.target.value)} />
            <Button onClick={grantDelivery}><ShieldCheck className="w-4 h-4" />Grant</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>{partners.map(p => (
              <TableRow key={p.user_id}>
                <TableCell>{p.display_name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell><Button variant="ghost" size="sm" onClick={() => revokeDelivery(p.user_id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default AdminPage;
