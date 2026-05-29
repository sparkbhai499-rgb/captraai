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
