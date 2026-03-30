import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Phone, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewChatDialogProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (contactId: string) => void;
  currentUserId: string;
}

const NewChatDialog = ({ open, onClose, onChatCreated, currentUserId }: NewChatDialogProps) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSearch = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError("");

    // Find user by phone number
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name, phone")
      .eq("phone", phone.trim())
      .maybeSingle();

    if (!profile) {
      setError("Is number se koi user nahi mila!");
      setLoading(false);
      return;
    }

    if (profile.user_id === currentUserId) {
      setError("Ye to apka khud ka number hai!");
      setLoading(false);
      return;
    }

    // Check if contact already exists
    const { data: existingContact } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("contact_user_id", profile.user_id)
      .maybeSingle();

    if (existingContact) {
      onChatCreated(existingContact.id);
      onClose();
      setPhone("");
      setLoading(false);
      return;
    }

    // Create new contact
    const { data: newContact, error: insertError } = await supabase
      .from("contacts")
      .insert({
        user_id: currentUserId,
        contact_user_id: profile.user_id,
        nickname: profile.display_name || profile.phone,
      })
      .select("id")
      .single();

    if (insertError) {
      setError("Contact add karne mein error aaya!");
      setLoading(false);
      return;
    }

    onChatCreated(newContact.id);
    onClose();
    setPhone("");
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Nayi Chat</h2>
          <button onClick={() => { onClose(); setPhone(""); setError(""); }} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Phone number daalke naya chat shuru karo
        </p>

        <div className="relative mb-3">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="tel"
            placeholder="+91 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
        </div>

        {error && <p className="text-xs text-destructive mb-3">{error}</p>}

        <Button
          onClick={handleSearch}
          disabled={loading || !phone.trim()}
          className="w-full rounded-xl h-11"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4 mr-1" /> Chat Shuru Karo
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default NewChatDialog;
