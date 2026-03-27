import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Camera, LogOut, User, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ProfilePage = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{
    display_name: string | null;
    status_text: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null>(null);
  const [editing, setEditing] = useState<"name" | "status" | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const handleSave = async (field: "display_name" | "status_text") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ [field]: editValue })
      .eq("user_id", user.id);

    setProfile((prev) => prev ? { ...prev, [field]: editValue } : prev);
    setEditing(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const startEdit = (field: "name" | "status", value: string | null) => {
    setEditing(field);
    setEditValue(value || "");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <h1 className="text-lg font-bold text-primary-foreground">Profile</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-primary/15 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-14 h-14 text-primary" />
              )}
            </div>
            <button className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-primary flex items-center justify-center shadow-md">
              <Camera className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="bg-card rounded-xl p-4 mb-3 border border-border">
          <label className="text-xs text-muted-foreground mb-1 block">Naam</label>
          {editing === "name" ? (
            <div className="flex items-center gap-2">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button onClick={() => handleSave("display_name")} className="p-2 text-primary">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                {profile?.display_name || "Set your name"}
              </span>
              <button onClick={() => startEdit("name", profile?.display_name)} className="p-1 text-muted-foreground hover:text-foreground">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="bg-card rounded-xl p-4 mb-3 border border-border">
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          {editing === "status" ? (
            <div className="flex items-center gap-2">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button onClick={() => handleSave("status_text")} className="p-2 text-primary">
                <Check className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                {profile?.status_text || "Hey there! I am using Message Hub"}
              </span>
              <button onClick={() => startEdit("status", profile?.status_text)} className="p-1 text-muted-foreground hover:text-foreground">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="bg-card rounded-xl p-4 mb-6 border border-border">
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <span className="text-sm text-foreground">{profile?.phone || "N/A"}</span>
        </div>

        {/* Logout */}
        <Button onClick={handleLogout} variant="destructive" className="w-full rounded-xl h-11">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
