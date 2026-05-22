import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bot, Plus, Trash2, Copy, MessageSquare, Loader2, Save, Code2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Agent {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  knowledge: string | null;
  model: string;
  greeting: string | null;
  is_public: boolean;
}
interface Conv { id: string; visitor_id: string | null; visitor_name: string | null; origin: string | null; last_message: string | null; last_message_at: string | null; }
interface Msg { id: string; role: string; content: string; created_at: string; }

const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const ENDPOINT = `https://${PROJECT_REF}.supabase.co/functions/v1/agent-chat`;
const APP_ORIGIN = window.location.origin;

export default function MyAgentsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [view, setView] = useState<"editor" | "conversations" | "embed">("editor");
  const [convs, setConvs] = useState<Conv[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!authLoading && !user) navigate("/"); }, [user, authLoading, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("my_agents").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAgents((data || []) as Agent[]);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const createAgent = async () => {
    if (!user) return;
    const { data, error } = await supabase.from("my_agents").insert({
      user_id: user.id, name: "My Agent",
      system_prompt: "You are a helpful AI assistant for my website. Be friendly and concise.",
      knowledge: "", greeting: "Hi! How can I help you today?",
    }).select().single();
    if (error) return toast.error(error.message);
    setAgents((p) => [data as Agent, ...p]);
    setSelected(data as Agent); setView("editor");
  };

  const saveAgent = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from("my_agents").update({
      name: selected.name, system_prompt: selected.system_prompt,
      knowledge: selected.knowledge, model: selected.model,
      greeting: selected.greeting, is_public: selected.is_public,
    }).eq("id", selected.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    load();
  };

  const deleteAgent = async (a: Agent) => {
    if (!confirm(`Delete "${a.name}"? This removes all its conversations.`)) return;
    const { error } = await supabase.from("my_agents").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    if (selected?.id === a.id) setSelected(null);
    load();
  };

  const loadConvs = async (a: Agent) => {
    const { data } = await supabase.from("my_agent_conversations").select("*")
      .eq("agent_id", a.id).order("last_message_at", { ascending: false }).limit(100);
    setConvs((data || []) as Conv[]);
  };
  useEffect(() => { if (selected && view === "conversations") loadConvs(selected); }, [selected, view]);

  useEffect(() => {
    if (!selectedConv) { setMsgs([]); return; }
    supabase.from("my_agent_messages").select("*").eq("conversation_id", selectedConv.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMsgs((data || []) as Msg[]));
  }, [selectedConv]);

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  if (authLoading || loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
        <button onClick={() => selected ? setSelected(null) : navigate("/")}><ArrowLeft className="w-5 h-5" /></button>
        <Bot className="w-5 h-5" />
        <h1 className="font-semibold flex-1 truncate">{selected ? selected.name : "My AI Agents"}</h1>
        {!selected && <button onClick={createAgent} className="flex items-center gap-1 bg-primary-foreground/20 hover:bg-primary-foreground/30 px-3 py-1.5 rounded text-sm"><Plus className="w-4 h-4" /> New</button>}
      </header>

      {!selected ? (
        <div className="flex-1 overflow-y-auto">
          {agents.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-3">
              <Bot className="w-12 h-12 mx-auto opacity-30" />
              <p>No agents yet. Create one to embed on your website.</p>
              <button onClick={createAgent} className="px-4 py-2 bg-primary text-primary-foreground rounded">Create Agent</button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-accent">
                  <button onClick={() => { setSelected(a); setView("editor"); }} className="flex-1 text-left">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.system_prompt}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{a.is_public ? "🌐 Public" : "🔒 Private"} · {a.model}</p>
                  </button>
                  <button onClick={() => deleteAgent(a)} className="p-2 text-destructive hover:bg-destructive/10 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex border-b border-border bg-card">
            {(["editor", "conversations", "embed"] as const).map((t) => (
              <button key={t} onClick={() => { setView(t); setSelectedConv(null); }}
                className={`flex-1 py-2.5 text-xs font-medium capitalize ${view === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
                {t === "embed" ? "Embed / API" : t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {view === "editor" && (
              <div className="p-4 space-y-3 max-w-2xl mx-auto">
                <Field label="Name"><input value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} className="w-full px-3 py-2 rounded bg-secondary text-sm" /></Field>
                <Field label="System Prompt (agent personality & instructions)">
                  <textarea value={selected.system_prompt} onChange={(e) => setSelected({ ...selected, system_prompt: e.target.value })} rows={5} className="w-full px-3 py-2 rounded bg-secondary text-sm font-mono" />
                </Field>
                <Field label="Knowledge Base (paste FAQs, product info, anything the agent should know)">
                  <textarea value={selected.knowledge || ""} onChange={(e) => setSelected({ ...selected, knowledge: e.target.value })} rows={6} placeholder="e.g. Our business hours are 9-5 Mon-Fri. We ship to all of India. Returns within 30 days..." className="w-full px-3 py-2 rounded bg-secondary text-sm" />
                </Field>
                <Field label="Welcome message"><input value={selected.greeting || ""} onChange={(e) => setSelected({ ...selected, greeting: e.target.value })} className="w-full px-3 py-2 rounded bg-secondary text-sm" /></Field>
                <Field label="AI Model">
                  <select value={selected.model} onChange={(e) => setSelected({ ...selected, model: e.target.value })} className="w-full px-3 py-2 rounded bg-secondary text-sm">
                    <option value="google/gemini-3-flash-preview">Gemini 3 Flash (fast, default)</option>
                    <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="google/gemini-2.5-pro">Gemini 2.5 Pro (smartest)</option>
                    <option value="openai/gpt-5-mini">GPT-5 mini</option>
                    <option value="openai/gpt-5">GPT-5</option>
                  </select>
                </Field>
                <label className="flex items-center justify-between p-3 bg-card border border-border rounded">
                  <span className="text-sm">Public (allow anyone with the agent ID to chat)</span>
                  <input type="checkbox" checked={selected.is_public} onChange={(e) => setSelected({ ...selected, is_public: e.target.checked })} />
                </label>
                <button onClick={saveAgent} disabled={saving} className="w-full py-3 rounded bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
                </button>
              </div>
            )}

            {view === "conversations" && (
              selectedConv ? (
                <div className="flex flex-col h-full">
                  <div className="px-4 py-2 bg-card border-b border-border flex items-center gap-2">
                    <button onClick={() => setSelectedConv(null)} className="text-sm text-primary">← Back</button>
                    <div className="text-xs text-muted-foreground">{selectedConv.origin || "—"} · {selectedConv.visitor_id?.slice(0, 12)}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-secondary/30">
                    {msgs.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.role === "assistant" ? "bg-card border border-border" : "bg-primary text-primary-foreground"}`}>
                          <p className="whitespace-pre-wrap">{m.content}</p>
                          <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : convs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground"><MessageSquare className="w-10 h-10 mx-auto opacity-30 mb-2" />No conversations yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {convs.map((c) => (
                    <button key={c.id} onClick={() => setSelectedConv(c)} className="w-full p-3 hover:bg-accent text-left">
                      <div className="flex justify-between text-xs text-muted-foreground"><span>{c.origin || "Unknown site"}</span><span>{c.last_message_at && new Date(c.last_message_at).toLocaleString()}</span></div>
                      <p className="text-sm truncate mt-1">{c.last_message || "—"}</p>
                    </button>
                  ))}
                </div>
              )
            )}

            {view === "embed" && (
              <div className="p-4 space-y-4 max-w-2xl mx-auto">
                <Snippet title="🆔 Agent ID" code={selected.id} onCopy={copy} />
                <Snippet title="🌐 API Endpoint (POST JSON)" code={ENDPOINT} onCopy={copy} />
                <Snippet title="📦 Embed Widget — paste before </body> on your website" code={`<script src="${APP_ORIGIN}/agent-widget.js"\n  data-agent-id="${selected.id}"\n  data-endpoint="${ENDPOINT}"\n  data-title="${selected.name}"\n  data-greeting="${selected.greeting || ""}"\n  data-color="#10b981"></script>`} onCopy={copy} />
                <Snippet title="🔧 Call from your own code (REST)" code={`fetch("${ENDPOINT}", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({\n    agent_id: "${selected.id}",\n    message: "Hello",\n    conversation_id: null,  // null on first call; reuse returned id\n    visitor_id: "visitor-123"\n  })\n}).then(r => r.json()).then(console.log)`} onCopy={copy} />
                <div className="p-3 bg-secondary rounded text-xs text-muted-foreground">
                  💡 <b>Tip:</b> Keep agent <b>Public</b> for the embed widget to work. Conversations from any website will appear in the Conversations tab.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-medium block mb-1 text-muted-foreground">{label}</label>{children}</div>;
}
function Snippet({ title, code, onCopy }: { title: string; code: string; onCopy: (t: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between"><p className="text-xs font-semibold">{title}</p>
        <button onClick={() => onCopy(code)} className="flex items-center gap-1 text-xs text-primary"><Copy className="w-3 h-3" /> Copy</button>
      </div>
      <pre className="text-[11px] bg-card border border-border rounded p-3 overflow-x-auto whitespace-pre-wrap break-all"><code>{code}</code></pre>
    </div>
  );
}
