import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Shield, Users, Mail, Video, Trash2, Plus, Pencil, CreditCard, Check, X, ExternalLink } from "lucide-react";

const emptyPlan = { name: "", slug: "", price_inr: 0, minutes_included: 0, features: "", is_popular: false, sort_order: 0 };

const AdminPage = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ users: 0, projects: 0, messages: 0, pending: 0 });
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [editPlan, setEditPlan] = useState<any | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({});

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);
  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("*").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setOk(!!data));
  }, [user]);

  const refresh = async () => {
    const [{ count: uc }, { count: pc }, { count: mc }, { count: pr }, { data: msgs }, { data: ulist }, { data: pl }, { data: pay }] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("contact_messages").select("*", { count: "exact", head: true }),
      supabase.from("payment_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.rpc("admin_list_users" as any),
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("payment_requests").select("*,plans(name)").order("created_at", { ascending: false }).limit(50),
    ]);
    const uMap = new Map(((ulist as any[]) || []).map((u: any) => [u.user_id, u]));
    setStats({ users: uc || 0, projects: pc || 0, messages: mc || 0, pending: pr || 0 });
    setMessages(msgs || []); setUsers((ulist as any) || []); setPlans(pl || []);
    setPayments(((pay as any[]) || []).map((p: any) => ({
      ...p,
      profiles: { display_name: uMap.get(p.user_id)?.display_name, phone: uMap.get(p.user_id)?.phone, email: uMap.get(p.user_id)?.email },
    })));
  };
  useEffect(() => { if (ok) refresh(); }, [ok]);

  const promote = async () => {
    if (!newAdminEmail) return;
    let uid: string | undefined = users.find(u => u.email?.toLowerCase() === newAdminEmail.toLowerCase())?.user_id;
    if (!uid && /^[0-9a-f-]{36}$/i.test(newAdminEmail)) uid = newAdminEmail;
    if (!uid) return toast.error("User not found");
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" as any });
    if (error) return toast.error(error.message);
    toast.success("Admin added"); setNewAdminEmail("");
  };

  const savePlan = async () => {
    if (!editPlan) return;
    const payload = {
      name: editPlan.name, slug: editPlan.slug, price_inr: Number(editPlan.price_inr) || 0,
      minutes_included: Number(editPlan.minutes_included) || 0, is_popular: !!editPlan.is_popular,
      sort_order: Number(editPlan.sort_order) || 0,
      features: typeof editPlan.features === "string"
        ? editPlan.features.split("\n").map((s: string) => s.trim()).filter(Boolean)
        : editPlan.features,
    };
    const { error } = editPlan.id
      ? await supabase.from("plans").update(payload).eq("id", editPlan.id)
      : await supabase.from("plans").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved"); setEditPlan(null); refresh();
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };

  const viewProof = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (data?.signedUrl) setProofUrl(data.signedUrl);
  };

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_payment_request" as any, { _id: id });
    if (error) return toast.error(error.message);
    toast.success("Approved — subscription activated"); refresh();
  };
  const reject = async (id: string) => {
    const note = rejectNote[id] || "Rejected";
    const { error } = await supabase.from("payment_requests").update({ status: "rejected", admin_note: note }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Rejected"); refresh();
  };
  const deleteMsg = async (id: string) => {
    await supabase.from("contact_messages").delete().eq("id", id);
    setMessages(m => m.filter(x => x.id !== id));
  };

  if (loading || ok === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;
  if (!ok) return (
    <div className="min-h-screen"><Navbar /><div className="container pt-32 max-w-md"><GlassCard className="text-center py-10"><Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3"/><p className="text-muted-foreground">Admin only.</p></GlassCard></div></div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-28 pb-16">
        <h1 className="font-display text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <GlassCard><div className="flex items-center gap-3"><Users className="w-6 h-6 text-primary"/><div><p className="text-xs text-muted-foreground">Users</p><p className="font-display text-2xl font-bold">{stats.users}</p></div></div></GlassCard>
          <GlassCard><div className="flex items-center gap-3"><Video className="w-6 h-6 text-accent"/><div><p className="text-xs text-muted-foreground">Projects</p><p className="font-display text-2xl font-bold">{stats.projects}</p></div></div></GlassCard>
          <GlassCard><div className="flex items-center gap-3"><CreditCard className="w-6 h-6 text-primary"/><div><p className="text-xs text-muted-foreground">Pending payments</p><p className="font-display text-2xl font-bold">{stats.pending}</p></div></div></GlassCard>
          <GlassCard><div className="flex items-center gap-3"><Mail className="w-6 h-6 text-primary"/><div><p className="text-xs text-muted-foreground">Messages</p><p className="font-display text-2xl font-bold">{stats.messages}</p></div></div></GlassCard>
        </div>

        <Tabs defaultValue="payments">
          <TabsList className="mb-6">
            <TabsTrigger value="payments">Payments {stats.pending > 0 && <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{stats.pending}</span>}</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <GlassCard>
              <h2 className="font-display text-lg font-semibold mb-4">Payment requests</h2>
              <div className="space-y-3">
                {payments.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
                {payments.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-border">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <p className="font-medium">{p.profiles?.display_name || "—"} · <span className="text-muted-foreground text-sm">{p.profiles?.phone}</span></p>
                        <p className="text-sm">Plan: <span className="text-primary">{p.plans?.name}</span> — ₹{p.amount_inr}</p>
                        <p className="text-xs text-muted-foreground">Ref: {p.upi_ref} · {new Date(p.created_at).toLocaleString()}</p>
                        {p.admin_note && <p className="text-xs text-red-400 mt-1">Note: {p.admin_note}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full h-fit ${p.status === "approved" ? "bg-green-500/20 text-green-400" : p.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{p.status}</span>
                    </div>
                    {p.status === "pending" && (
                      <div className="mt-3 flex gap-2 flex-wrap items-center">
                        {p.screenshot_path && <Button size="sm" variant="outline" onClick={() => viewProof(p.screenshot_path)}><ExternalLink className="w-3.5 h-3.5 mr-1"/>View proof</Button>}
                        <Button size="sm" onClick={() => approve(p.id)} className="gradient-primary text-white border-0"><Check className="w-3.5 h-3.5 mr-1"/>Approve</Button>
                        <Input placeholder="Reject reason" value={rejectNote[p.id] || ""} onChange={(e) => setRejectNote({ ...rejectNote, [p.id]: e.target.value })} className="h-8 w-40 bg-secondary/50"/>
                        <Button size="sm" variant="destructive" onClick={() => reject(p.id)}><X className="w-3.5 h-3.5 mr-1"/>Reject</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="plans">
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Plans</h2>
                <Button size="sm" onClick={() => setEditPlan({ ...emptyPlan })} className="gradient-primary text-white border-0"><Plus className="w-4 h-4 mr-1"/>New plan</Button>
              </div>
              <div className="space-y-2">
                {plans.map((p) => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium">{p.name} {p.is_popular && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">Popular</span>}</p>
                      <p className="text-xs text-muted-foreground">₹{p.price_inr}/mo · {p.minutes_included} min · slug: {p.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setEditPlan({ ...p, features: (p.features || []).join("\n") })}><Pencil className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => deletePlan(p.id)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="users">
            <GlassCard className="mb-4">
              <h2 className="font-display text-lg font-semibold mb-3">Grant admin</h2>
              <div className="flex gap-2">
                <Input placeholder="email or user_id UUID" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="bg-secondary/50"/>
                <Button onClick={promote} className="gradient-primary text-white border-0">Add</Button>
              </div>
            </GlassCard>
            <GlassCard>
              <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
                <h2 className="font-display text-lg font-semibold">All users ({users.length})</h2>
                <Input placeholder="Search…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="bg-secondary/50 max-w-xs"/>
              </div>
              <div className="overflow-x-auto max-h-[420px]">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b border-border">
                    <tr><th className="text-left py-2 px-2">Name</th><th className="text-left py-2 px-2">Email</th><th className="text-left py-2 px-2">Phone</th><th className="text-left py-2 px-2">Projects</th><th className="text-left py-2 px-2">Joined</th></tr>
                  </thead>
                  <tbody>
                    {users.filter(u => { const q = userSearch.toLowerCase().trim(); return !q || (u.email || "").toLowerCase().includes(q) || (u.display_name || "").toLowerCase().includes(q); }).map((u) => (
                      <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-2 px-2">{u.display_name || "—"}</td>
                        <td className="py-2 px-2 font-mono text-xs">{u.email || "—"}</td>
                        <td className="py-2 px-2">{u.phone || "—"}</td>
                        <td className="py-2 px-2">{u.project_count}</td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="messages">
            <GlassCard>
              <h2 className="font-display text-lg font-semibold mb-3">Contact messages</h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
                {messages.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg border border-border">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{m.name} · <span className="text-muted-foreground">{m.email}</span></p>
                        {m.subject && <p className="text-xs text-muted-foreground">{m.subject}</p>}
                        <p className="text-sm mt-1.5">{m.message}</p>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => deleteMsg(m.id)}><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Plan editor */}
      <Dialog open={!!editPlan} onOpenChange={(v) => !v && setEditPlan(null)}>
        <DialogContent className="glass border-white/10 max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editPlan?.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          {editPlan && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Name</Label><Input value={editPlan.name} onChange={(e) => setEditPlan({ ...editPlan, name: e.target.value })} className="bg-secondary/50 mt-1"/></div>
                <div><Label className="text-xs">Slug</Label><Input value={editPlan.slug} onChange={(e) => setEditPlan({ ...editPlan, slug: e.target.value })} className="bg-secondary/50 mt-1"/></div>
                <div><Label className="text-xs">Price (₹)</Label><Input type="number" value={editPlan.price_inr} onChange={(e) => setEditPlan({ ...editPlan, price_inr: e.target.value })} className="bg-secondary/50 mt-1"/></div>
                <div><Label className="text-xs">Minutes included</Label><Input type="number" value={editPlan.minutes_included} onChange={(e) => setEditPlan({ ...editPlan, minutes_included: e.target.value })} className="bg-secondary/50 mt-1"/></div>
                <div><Label className="text-xs">Sort order</Label><Input type="number" value={editPlan.sort_order} onChange={(e) => setEditPlan({ ...editPlan, sort_order: e.target.value })} className="bg-secondary/50 mt-1"/></div>
                <div className="flex items-end gap-2"><input type="checkbox" checked={!!editPlan.is_popular} onChange={(e) => setEditPlan({ ...editPlan, is_popular: e.target.checked })} id="pop"/><Label htmlFor="pop" className="text-xs">Mark as popular</Label></div>
              </div>
              <div>
                <Label className="text-xs">Features (one per line)</Label>
                <Textarea rows={5} value={editPlan.features} onChange={(e) => setEditPlan({ ...editPlan, features: e.target.value })} className="bg-secondary/50 mt-1"/>
              </div>
              <Button onClick={savePlan} className="w-full gradient-primary text-white border-0">Save</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof viewer */}
      <Dialog open={!!proofUrl} onOpenChange={(v) => !v && setProofUrl(null)}>
        <DialogContent className="glass border-white/10 max-w-2xl">
          <DialogHeader><DialogTitle>Payment proof</DialogTitle></DialogHeader>
          {proofUrl && <img src={proofUrl} alt="proof" className="w-full rounded-lg"/>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
