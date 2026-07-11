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
      const [{ count: uc }, { count: pc }, { count: mc }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }),
        supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      setStats({ users: uc || 0, projects: pc || 0, messages: mc || 0 });
      setMessages(msgs || []);
    })();
  }, [ok]);

  const promote = async () => {
    if (!newAdminEmail) return;
    const { data: profs } = await supabase.from("profiles").select("user_id").eq("display_name", newAdminEmail).limit(1);
    // Fallback: allow lookup by user_id UUID directly if display_name doesn't match
    const uid = profs?.[0]?.user_id;
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
            <p className="text-xs text-muted-foreground mb-3">Paste a user's UUID (from profiles table) to add admin role.</p>
            <div className="flex gap-2">
              <Input placeholder="user_id UUID" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} className="bg-secondary/50"/>
              <Button onClick={promote} className="gradient-primary text-white border-0">Add</Button>
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
