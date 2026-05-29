import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Ban, UserCheck, Eye, Shield, Users, Code2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

interface UserProfile {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  status_text: string | null;
  created_at: string;
  is_banned: boolean;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    
    const admin = data?.some((r) => r.role === "admin") || false;
    setIsAdmin(admin);
    if (admin) loadUsers();
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, phone, avatar_url, status_text, created_at, is_banned")
      .order("created_at", { ascending: false });
    
    if (data) setUsers(data as UserProfile[]);
  };

  const toggleBan = async (targetUserId: string, currentBanned: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !currentBanned })
      .eq("user_id", targetUserId);

    if (error) {
      toast.error("Action fail ho gaya!");
    } else {
      toast.success(currentBanned ? "User unbanned!" : "User banned!");
      loadUsers();
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Shield className="w-16 h-16 text-destructive" />
        <p className="text-lg font-bold text-foreground">Access Denied</p>
        <p className="text-sm text-muted-foreground">Aapko admin access nahi hai</p>
        <Button onClick={() => navigate("/")} variant="outline">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <Shield className="w-5 h-5 text-primary-foreground" />
        <h1 className="text-lg font-bold text-primary-foreground">Admin Panel</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{users.length}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <UserCheck className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{users.filter(u => !u.is_banned).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border text-center">
            <Ban className="w-6 h-6 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{users.filter(u => u.is_banned).length}</p>
            <p className="text-xs text-muted-foreground">Banned</p>
          </div>
        </div>

        {/* Embed Widget Generator */}
        <EmbedWidgetSection />

        {/* Users Table */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-semibold text-foreground">All Users</h2>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-accent-foreground">
                              {(u.display_name || "?").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                          {u.display_name || "No Name"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.phone || "N/A"}
                    </TableCell>
                    <TableCell>
                      {u.is_banned ? (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full">Banned</span>
                      ) : (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Active</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setSelectedUser(u); setShowDetail(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={u.is_banned ? "outline" : "destructive"}
                          onClick={() => toggleBan(u.user_id, u.is_banned)}
                        >
                          {u.is_banned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* User Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-accent-foreground">
                      {(selectedUser.display_name || "?").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{selectedUser.display_name || "No Name"}</p>
                  <p className="text-sm text-muted-foreground">{selectedUser.phone || "No phone"}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-foreground">{selectedUser.status_text || "N/A"}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Joined</span>
                  <span className="text-foreground">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Account</span>
                  <span className={selectedUser.is_banned ? "text-destructive" : "text-primary"}>
                    {selectedUser.is_banned ? "Banned" : "Active"}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">User ID</span>
                  <span className="text-foreground text-xs truncate max-w-[180px]">{selectedUser.user_id}</span>
                </div>
              </div>
              <Button
                className="w-full"
                variant={selectedUser.is_banned ? "outline" : "destructive"}
                onClick={() => {
                  toggleBan(selectedUser.user_id, selectedUser.is_banned);
                  setShowDetail(false);
                }}
              >
                {selectedUser.is_banned ? "Unban User" : "Ban User"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;

function EmbedWidgetSection() {
  const [title, setTitle] = useState("W8 AI Assistant");
  const [color, setColor] = useState("#10b981");
  const [greeting, setGreeting] = useState("Hi! Main W8 AI hoon. Kuch bhi pucho 👋");
  const [copied, setCopied] = useState(false);

  const scriptUrl = `${window.location.origin}/w8-ai-widget.js`;
  const snippet = `<script src="${scriptUrl}"
        data-title="${title.replace(/"/g, "&quot;")}"
        data-color="${color}"
        data-greeting="${greeting.replace(/"/g, "&quot;")}"></script>`;

  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    toast.success("Embed code copy ho gaya!");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Code2 className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-foreground">AI Chatbot Embed Code</h2>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Apni doosri website ke <code className="px-1 bg-muted rounded">&lt;body&gt;</code> me ye snippet paste karo —
          floating AI chatbot button add ho jayega (same W8 AI brain).
        </p>

        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Theme Color</Label>
            <div className="flex gap-2">
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-12 p-1 h-10" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Greeting</Label>
            <Input value={greeting} onChange={(e) => setGreeting(e.target.value)} />
          </div>
        </div>

        <div className="relative">
          <pre className="bg-muted text-foreground text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
{snippet}
          </pre>
          <Button size="sm" onClick={copy} className="absolute top-2 right-2">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Kaise lagayein:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Apni website ka HTML file kholo</li>
            <li>Closing <code className="px-1 bg-muted rounded">&lt;/body&gt;</code> tag ke just upar paste karo</li>
            <li>Save & refresh — bottom-right corner me chat button aa jayega</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
