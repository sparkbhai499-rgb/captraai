import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const CreateCommunityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error("Community name zaroori hai!");
      return;
    }

    setCreating(true);
    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
        is_public: isPublic,
      })
      .select("id")
      .single();

    if (error) {
      toast.error("Community create nahi ho payi!");
      setCreating(false);
      return;
    }

    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: user.id,
      role: "admin",
    });

    toast.success("Community created! 🎉");
    setCreating(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <Globe className="w-5 h-5 text-primary-foreground" />
        <h1 className="text-lg font-bold text-primary-foreground">Create Community</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block">Community Name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter community name"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Community ke baare mein likho..."
            rows={3}
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div className="bg-card rounded-xl p-4 border border-border flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Public Community</p>
            <p className="text-xs text-muted-foreground">Koi bhi join kar sakta hai</p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>

        <Button onClick={handleCreate} disabled={creating} className="w-full rounded-xl h-11">
          <Globe className="w-4 h-4 mr-2" />
          {creating ? "Creating..." : "Create Community"}
        </Button>
      </div>
    </div>
  );
};

export default CreateCommunityPage;
