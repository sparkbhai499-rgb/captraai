import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/Navbar";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Shield, Users, Mail, Video, Trash2 } from "lucide-react";

const AdminPage = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ users: 0, projects: 0, messages: 0 });
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  useEffect(() => { if (!loading && !user) nav("/auth"); }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("*").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setOk(!!data));
  }, [user]);

  useEffect(() => {
    if (!ok) return;
    (async () => {
      const [{ count: uc }, { count: pc }, { count: mc }, { data: msgs }, { data: ulist }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.rpc("admin_list_users" as any),
      ]);
      setStats({ users: uc || 0, projects: pc || 0, messages: mc || 0 });
      setMessages(msgs || []);
      setUsers((ulist as any) || []);
    })();
  }, [ok]);

  const promote = async () => {
    if (!newAdminEmail) return;
    // Try match by email first (from admin_list_users), then display_name, then treat as raw UUID
    let uid: string | undefined = users.find(u => u.email?.toLowerCase() === newAdminEmail.toLowerCase())?.user_id;
    if (!uid) {
      const { data: profs } = await supabase.from("profiles").select("user_id").eq("display_name", newAdminEmail).limit(1);
      uid = profs?.[0]?.user_id;
    }
    if (!uid && /^[0-9a-f-]{36}$/i.test(newAdminEmail)) uid = newAdminEmail;
    if (!uid) return toast.error("User not found — paste their user_id UUID instead of email if needed");
    const { error } = await supabase.from("user_roles").insert({ user_id: uid, role: "admin" as any });
    if (error) return toast.error(error.message);
    toast.success("Admin added");
    setNewAdminEmail("");
  };

  const deleteMsg = async (id: string) => {
    await supabase.from("contact_messages").delete().eq("id", id);
    setMessages(m => m.filter(x => x.id !== id));
  };

  if (loading || ok === null) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary"/></div>;
  if (!ok) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-32 max-w-md">
        <GlassCard className="text-center py-10">
          <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3"/>
          <p className="text-muted-foreground">Admin only.</p>
        </GlassCard>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container pt-28 pb-16">
        <h1 className="font-display text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <GlassCard><div className="flex items-center gap-3"><Users className="w-6 h-6 text-primary"/><div><p className="text-xs text-muted-foreground">Users</p><p className="font-display text-2xl font-bold">{stats.users}</p></div></div></GlassCard>
          <GlassCard><div className="flex items-center gap-3"><Video className="w-6 h-6 text-accent"/><div><p className="text-xs text-muted-foreground">Projects</p><p className="font-display text-2xl font-bold">{stats.projects}</p></div></div></GlassCard>
          <GlassCard><div className="flex items-center gap-3"><Mail className="w-6 h-6 text-primary"/><div><p className="text-xs text-muted-foreground">Messages</p><p className="font-display text-2xl font-bold">{stats.messages}</p></div></div></GlassCard>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <GlassCard>
            <h2 className="font-display text-lg font-semibold mb-3">Grant admin</h2>
            <p className="text-xs text-muted-foreground mb-3">Type user's email or paste their UUID.</p>
            <div className="flex gap-2">
              <Input placeholder="email or user_id UUID" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="bg-secondary/50"/>
              <Button onClick={promote} className="gradient-primary text-white border-0">Add</Button>
            </div>
          </GlassCard>

          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <h2 className="font-display text-lg font-semibold">All users ({users.length})</h2>
              <Input placeholder="Search name or email…" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="bg-secondary/50 max-w-xs"/>
            </div>
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Email</th>
                    <th className="text-left py-2 px-2">Phone</th>
                    <th className="text-left py-2 px-2">Projects</th>
                    <th className="text-left py-2 px-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users
                    .filter(u => {
                      const q = userSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (u.email || "").toLowerCase().includes(q) || (u.display_name || "").toLowerCase().includes(q);
                    })
                    .map((u) => (
                    <tr key={u.user_id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 px-2">{u.display_name || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 px-2 font-mono text-xs">{u.email || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 px-2">{u.phone || <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 px-2">{u.project_count}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No users yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="font-display text-lg font-semibold mb-3">Contact messages</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
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
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
