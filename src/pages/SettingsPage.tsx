import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, User, Shield, Check, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SettingsPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [currentPhone, setCurrentPhone] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("phone, display_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      setCurrentPhone(profile.phone);
      setCurrentName(profile.display_name);
      setPhone(profile.phone || "");
      setDisplayName(profile.display_name || "");
      setAvatarUrl(profile.avatar_url);
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles?.some((r) => r.role === "admin")) {
      setIsAdmin(true);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file upload karo!");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image 2MB se chhoti honi chahiye!");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload fail ho gaya!");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase
      .from("profiles")
      .update({ avatar_url: newUrl })
      .eq("user_id", user.id);

    setAvatarUrl(newUrl);
    setUploading(false);
    toast.success("Profile picture updated!");
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!phone.trim()) {
      toast.error("Phone number zaroori hai!");
      return;
    }

    if (!displayName.trim()) {
      toast.error("Name zaroori hai!");
      return;
    }

    if (phone !== currentPhone) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", phone.trim())
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("Yeh phone number pehle se kisi aur ka hai!");
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: phone.trim(), display_name: displayName.trim() })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast.error("Save nahi ho paya, dobara try karo");
    } else {
      setCurrentPhone(phone.trim());
      setCurrentName(displayName.trim());
      toast.success("Settings saved!");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-primary-foreground" />
        </button>
        <h1 className="text-lg font-bold text-primary-foreground">Settings</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {isAdmin && (
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Admin Account</span>
          </div>
        )}

        {/* Profile Picture */}
        <div className="bg-card rounded-xl p-4 border border-border flex flex-col items-center">
          <label className="text-xs text-muted-foreground mb-3 block self-start">Profile Picture</label>
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-primary" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-primary-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Name */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
            <User className="w-3 h-3" /> Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Apna naam daalein"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {!currentName && (
            <p className="text-xs text-destructive mt-1">⚠️ Name set nahi hai!</p>
          )}
        </div>

        {/* Phone */}
        <div className="bg-card rounded-xl p-4 border border-border">
          <label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
            <Phone className="w-3 h-3" /> Phone Number
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            className="w-full bg-secondary rounded-lg px-3 py-2 text-sm text-secondary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {!currentPhone && (
            <p className="text-xs text-destructive mt-1">⚠️ Phone number set nahi hai!</p>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl h-11">
          <Check className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
