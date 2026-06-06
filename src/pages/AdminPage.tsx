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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Trash2, ShieldCheck, Shield, Truck, Users, Package,
  IndianRupee, Clock, CheckCircle2, Crown, X, Search,
} from "lucide-react";

type Role = "admin" | "delivery";

interface UserRow {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  roles: Role[];
  is_super: boolean;
}

const StatCard = ({ icon: Icon, label, value, tone }: any) => (
  <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tone}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);

const AdminPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ customer_name: "", customer_phone: "", address: "", items_summary: "", total: "", payout: "40", delivery_otp: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); if (!data) navigate("/"); });
  }, [user]);

  const loadAll = async () => {
    const [{ data: o }, { data: profs }, { data: roles }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("profiles").select("user_id,display_name,phone"),
      supabase.from("user_roles").select("user_id,role,is_super"),
    ]);
    setOrders(o || []);
    const byUser = new Map<string, UserRow>();
    (profs || []).forEach((p: any) => byUser.set(p.user_id, { ...p, roles: [], is_super: false }));
    (roles || []).forEach((r: any) => {
      const row = byUser.get(r.user_id) || { user_id: r.user_id, display_name: null, phone: null, roles: [], is_super: false };
      row.roles.push(r.role);
      if (r.is_super) row.is_super = true;
      byUser.set(r.user_id, row);
    });
    setUsers(Array.from(byUser.values()));
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

  const toggleRole = async (u: UserRow, role: Role) => {
    if (u.is_super && role === "admin") {
      toast({ title: "Super admin protected", description: "Main admin ko remove nahi kar sakte", variant: "destructive" });
      return;
    }
    const has = u.roles.includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", u.user_id).eq("role", role as any);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: `${role} role removed` }); loadAll(); }
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: u.user_id, role: role as any });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: `${role} role granted` }); loadAll(); }
    }
  };

  if (loading || isAdmin === null) return <AppShell><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppShell>;
  if (!isAdmin) return null;

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    active: orders.filter(o => ["assigned", "picked_up"].includes(o.status)).length,
    delivered: orders.filter(o => o.status === "delivered").length,
    revenue: orders.filter(o => o.status === "delivered").reduce((s, o) => s + Number(o.total || 0), 0),
    partners: users.filter(u => u.roles.includes("delivery")).length,
  };

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (u.display_name || "").toLowerCase().includes(q) || (u.phone || "").includes(q);
  });

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Orders, users, aur partners ka control panel</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard icon={Package} label="Total Orders" value={stats.total} tone="bg-primary/10 text-primary" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} tone="bg-amber-500/10 text-amber-600" />
        <StatCard icon={Truck} label="Active" value={stats.active} tone="bg-blue-500/10 text-blue-600" />
        <StatCard icon={CheckCircle2} label="Delivered" value={stats.delivered} tone="bg-emerald-500/10 text-emerald-600" />
        <StatCard icon={IndianRupee} label="Revenue" value={`₹${stats.revenue}`} tone="bg-violet-500/10 text-violet-600" />
        <StatCard icon={Users} label="Partners" value={stats.partners} tone="bg-pink-500/10 text-pink-600" />
      </div>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="new">+ New Order</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <div className="rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>OTP</TableHead><TableHead>Total</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell><div className="font-medium">{o.customer_name}</div><div className="text-xs text-muted-foreground">{o.customer_phone}</div></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{o.items_summary}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{o.status.replace("_"," ")}</Badge></TableCell>
                    <TableCell className="font-mono">{o.delivery_otp}</TableCell>
                    <TableCell>₹{o.total}</TableCell>
                    <TableCell>{o.status !== "delivered" && o.status !== "cancelled" && (
                      <Button variant="ghost" size="icon" onClick={() => cancelOrder(o.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    )}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
          <Input
            inputMode="numeric"
            maxLength={4}
            placeholder="4-digit delivery OTP (customer ko batana)"
            value={form.delivery_otp}
            onChange={e=>setForm({...form,delivery_otp:e.target.value.replace(/\D/g,"").slice(0,4)})}
            className="font-mono tracking-widest"
          />
          <Button onClick={createOrder} disabled={creating || !form.customer_name || !form.customer_phone || !form.address}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Create Order</>}
          </Button>
        </TabsContent>

        <TabsContent value="users" className="mt-6 space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Name ya phone se search karo" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Total users: {users.length}. Main (super) admin ko koi remove nahi kar sakta.</p>
          <div className="rounded-2xl border border-border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Phone</TableHead><TableHead>Roles</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredUsers.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-semibold text-xs">
                          {(u.display_name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-1.5">
                            {u.display_name || "—"}
                            {u.is_super && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.is_super && <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Super Admin</Badge>}
                        {u.roles.includes("admin") && !u.is_super && <Badge variant="secondary"><Shield className="w-3 h-3 mr-1" />Admin</Badge>}
                        {u.roles.includes("delivery") && <Badge variant="secondary"><Truck className="w-3 h-3 mr-1" />Delivery</Badge>}
                        {u.roles.length === 0 && <span className="text-xs text-muted-foreground">User</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="sm"
                        variant={u.roles.includes("delivery") ? "outline" : "secondary"}
                        onClick={() => toggleRole(u, "delivery")}
                      >
                        {u.roles.includes("delivery") ? <><X className="w-3 h-3" />Delivery</> : <><Truck className="w-3 h-3" />Make Delivery</>}
                      </Button>
                      <Button
                        size="sm"
                        variant={u.roles.includes("admin") ? "outline" : "default"}
                        onClick={() => toggleRole(u, "admin")}
                        disabled={u.is_super}
                        title={u.is_super ? "Super admin protected" : ""}
                      >
                        {u.roles.includes("admin") ? <><X className="w-3 h-3" />Admin</> : <><ShieldCheck className="w-3 h-3" />Make Admin</>}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default AdminPage;
