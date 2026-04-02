import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CreateGroupPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

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

    // Add creator as admin member
    await supabase.from("group_members").insert({
      group_id: data.id,
      user_id: user.id,
      role: "admin",
    });

    toast.success("Group created! 🎉");
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
            rows={3}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
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
