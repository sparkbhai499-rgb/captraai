import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ProfileItem {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

const CreateGroupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allProfiles, setAllProfiles] = useState<ProfileItem[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ProfileItem[]>([]);

  useEffect(() => {
    const loadProfiles = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, phone, avatar_url")
        .neq("user_id", user.id)
        .eq("is_banned", false);
      if (data) setAllProfiles(data);
    };
    loadProfiles();
  }, [user]);

  const filteredProfiles = allProfiles.filter((p) => {
    if (selectedMembers.some((m) => m.user_id === p.user_id)) return false;
    const q = searchQuery.toLowerCase();
    return (
      (p.display_name?.toLowerCase().includes(q) ?? false) ||
      (p.phone?.includes(q) ?? false)
    );
  });

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error("Group name zaroori hai!");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("groups")
      .insert({ name: name.trim(), description: description.trim() || null, created_by: user.id })
      .select("id")
      .single();

    if (error) {
      toast.error("Group create nahi ho paya!");
      setCreating(false);
      return;
    }

    // Add creator as admin + selected members
    const memberInserts = [
      { group_id: data.id, user_id: user.id, role: "admin" },
      ...selectedMembers.map((m) => ({ group_id: data.id, user_id: m.user_id, role: "member" })),
    ];
    await supabase.from("group_members").insert(memberInserts);

    toast.success(`Group created with ${selectedMembers.length + 1} members! 🎉`);
    setCreating(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <Users className="w-5 h-5 text-primary-foreground" />
        <h1 className="text-lg font-bold text-primary-foreground">Create Group</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block">Group Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter group name"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Group ke baare mein likho..."
            rows={2}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Selected Members */}
        {selectedMembers.length > 0 && (
          <div className="bg-card rounded-xl p-4 border border-border">
            <label className="text-xs text-muted-foreground mb-2 block">
              Members ({selectedMembers.length + 1} including you)
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedMembers.map((m) => (
                <span
                  key={m.user_id}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2.5 py-1.5 rounded-full"
                >
                  {m.display_name || m.phone}
                  <button onClick={() => setSelectedMembers((prev) => prev.filter((p) => p.user_id !== m.user_id))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Add Members */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block">Add Members</label>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredProfiles.map((p) => (
              <button
                key={p.user_id}
                onClick={() => setSelectedMembers((prev) => [...prev, p])}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-accent-foreground overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (p.display_name || "?").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.display_name || "No name"}</p>
                  <p className="text-xs text-muted-foreground">{p.phone || "No phone"}</p>
                </div>
                <Plus className="w-4 h-4 text-primary" />
              </button>
            ))}
            {filteredProfiles.length === 0 && searchQuery && (
              <p className="text-xs text-muted-foreground text-center py-3">Koi user nahi mila</p>
            )}
          </div>
        </div>

        <Button onClick={handleCreate} disabled={creating} className="w-full rounded-xl h-11">
          <Users className="w-4 h-4 mr-2" />
          {creating ? "Creating..." : "Create Group"}
        </Button>
      </div>
    </div>
  );
};

export default CreateGroupPage;
