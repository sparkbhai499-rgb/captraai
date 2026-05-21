import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Send, Power, MessageSquare, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Conversation {
  id: string;
  phone_number: string;
  display_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  agent_enabled: boolean;
  unread_count: number;
}
interface WAMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}
interface Settings {
  id: string;
  system_prompt: string;
  agent_enabled: boolean;
  twilio_whatsapp_from: string | null;
  model: string;
}

const WEBHOOK_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

const WhatsappAgentPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"conversations" | "settings">("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).then(({ data }) => {
      setIsAdmin(data?.some((r) => r.role === "admin") || false);
    });
  }, [user]);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    setConversations(data || []);
    setLoading(false);
  }, []);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from("agent_settings").select("*").limit(1).maybeSingle();
    setSettings(data as Settings | null);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadConversations();
      loadSettings();
    }
  }, [isAdmin, loadConversations, loadSettings]);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", selected.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));
    supabase.from("whatsapp_conversations").update({ unread_count: 0 }).eq("id", selected.id).then();
  }, [selected]);

  // Realtime
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("wa-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const m = payload.new as WAMessage & { conversation_id: string };
        if (selected && m?.conversation_id === selected.id) {
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        }
        loadConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin, selected, loadConversations]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("agent_settings")
      .update({
        system_prompt: settings.system_prompt,
        agent_enabled: settings.agent_enabled,
        twilio_whatsapp_from: settings.twilio_whatsapp_from,
        model: settings.model,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Settings saved");
  };

  const toggleAgent = async (conv: Conversation, value: boolean) => {
    await supabase.from("whatsapp_conversations").update({ agent_enabled: value }).eq("id", conv.id);
    loadConversations();
    if (selected?.id === conv.id) setSelected({ ...conv, agent_enabled: value });
  };

  if (isAdmin === null) {
    return <div className="h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-3 p-4 text-center">
        <Shield />
        <p>Sirf admin access kar sakte hai</p>
        <button onClick={() => navigate("/")} className="px-4 py-2 rounded bg-primary text-primary-foreground">Back</button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
        <button onClick={() => selected ? setSelected(null) : navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Bot className="w-5 h-5" />
        <h1 className="font-semibold flex-1">WhatsApp AI Agent</h1>
      </div>

      {!selected && (
        <div className="flex border-b border-border">
          <button onClick={() => setTab("conversations")} className={`flex-1 py-3 text-sm font-medium ${tab === "conversations" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            Conversations
          </button>
          <button onClick={() => setTab("settings")} className={`flex-1 py-3 text-sm font-medium ${tab === "settings" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
            Settings
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <ConversationView conv={selected} messages={messages} onToggleAgent={(v) => toggleAgent(selected, v)} />
        ) : tab === "conversations" ? (
          <ConversationsList loading={loading} conversations={conversations} onSelect={setSelected} />
        ) : (
          <SettingsView settings={settings} setSettings={setSettings} onSave={saveSettings} saving={saving} webhookUrl={WEBHOOK_URL} />
        )}
      </div>
    </div>
  );
};

function ConversationsList({ loading, conversations, onSelect }: { loading: boolean; conversations: Conversation[]; onSelect: (c: Conversation) => void }) {
  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  if (conversations.length === 0) return (
    <div className="p-8 text-center text-muted-foreground space-y-2">
      <MessageSquare className="w-12 h-12 mx-auto opacity-30" />
      <p>Abhi koi conversation nahi hai.</p>
      <p className="text-xs">Twilio webhook configure karne ke baad messages yahan aayenge.</p>
    </div>
  );
  return (
    <div className="divide-y divide-border">
      {conversations.map((c) => (
        <button key={c.id} onClick={() => onSelect(c)} className="w-full p-3 flex items-center gap-3 hover:bg-accent text-left">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
            {(c.display_name || c.phone_number).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
              <p className="font-medium truncate">{c.display_name || c.phone_number}</p>
              {c.unread_count > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-2">{c.unread_count}</span>}
            </div>
            <p className="text-xs text-muted-foreground truncate">{c.last_message || "—"}</p>
          </div>
          {!c.agent_enabled && <Power className="w-4 h-4 text-destructive" />}
        </button>
      ))}
    </div>
  );
}

function ConversationView({ conv, messages, onToggleAgent }: { conv: Conversation; messages: WAMessage[]; onToggleAgent: (v: boolean) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-card border-b border-border flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{conv.display_name || conv.phone_number}</p>
          <p className="text-xs text-muted-foreground">{conv.phone_number}</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          AI auto-reply
          <input type="checkbox" checked={conv.agent_enabled} onChange={(e) => onToggleAgent(e.target.checked)} />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView({ settings, setSettings, onSave, saving, webhookUrl }: { settings: Settings | null; setSettings: (s: Settings) => void; onSave: () => void; saving: boolean; webhookUrl: string }) {
  if (!settings) return <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div className="p-3 bg-secondary rounded-lg space-y-2">
        <p className="text-xs font-semibold">📌 Twilio Webhook URL (yeh Twilio sandbox me paste karein)</p>
        <code className="block text-xs break-all bg-background p-2 rounded">{webhookUrl}</code>
        <p className="text-[10px] text-muted-foreground">Twilio Console → Messaging → WhatsApp Sandbox Settings → "When a message comes in" → POST</p>
      </div>

      <label className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
        <span className="font-medium">Agent enabled (global)</span>
        <input type="checkbox" checked={settings.agent_enabled} onChange={(e) => setSettings({ ...settings, agent_enabled: e.target.checked })} />
      </label>

      <div>
        <label className="text-sm font-medium block mb-1">System Prompt (agent ki personality)</label>
        <textarea
          value={settings.system_prompt}
          onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
          rows={8}
          className="w-full px-3 py-2 rounded-lg bg-secondary text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">AI Model</label>
        <select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary text-sm">
          <option value="google/gemini-3-flash-preview">Gemini 3 Flash (fast, default)</option>
          <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (smarter)</option>
          <option value="openai/gpt-5-mini">GPT-5 mini</option>
          <option value="openai/gpt-5">GPT-5</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium block mb-1">Twilio WhatsApp "From" number (optional, e.g. whatsapp:+14155238886)</label>
        <input
          value={settings.twilio_whatsapp_from || ""}
          onChange={(e) => setSettings({ ...settings, twilio_whatsapp_from: e.target.value })}
          placeholder="whatsapp:+14155238886"
          className="w-full px-3 py-2 rounded-lg bg-secondary text-sm"
        />
      </div>

      <button onClick={onSave} disabled={saving} className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        Save Settings
      </button>
    </div>
  );
}

function Shield() {
  return <Bot className="w-12 h-12 text-muted-foreground" />;
}

export default WhatsappAgentPage;
