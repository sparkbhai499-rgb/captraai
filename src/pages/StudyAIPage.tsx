import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Bot, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import LoginPage from "./LoginPage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
const STORAGE_KEY = "studyhub-ai-chat";

const StudyAIPage = () => {
  const { user, loading } = useAuth();
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60))); } catch {}
  }, [messages]);

  const suggestions = [
    "Photosynthesis ko simple words me samjhao",
    "Quadratic equation solve karne ka shortcut",
    "Newton's laws ka short summary do",
    "Mujhe daily study routine banake do",
  ];

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Bahut requests, thodi der baad try karein.");
        else if (resp.status === 402) toast.error("AI credits khatam ho gaye.");
        else toast.error("AI reply nahi mila.");
        setBusy(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let started = false;
      let done = false;

      const push = (chunk: string) => {
        acc += chunk;
        setMessages((prev) => {
          if (!started) { started = true; return [...prev, { role: "assistant", content: acc }]; }
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: acc } : m);
        });
      };

      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(data);
            const c = p.choices?.[0]?.delta?.content;
            if (c) push(c);
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const clear = () => { setMessages([]); localStorage.removeItem(STORAGE_KEY); };

  if (loading) return null;
  if (!user) return <LoginPage onLogin={() => window.location.reload()} />;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Study AI Tutor</h1>
              <p className="text-sm text-muted-foreground">Apne doubts puchho, padhai me madad lo</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} className="gap-1.5">
              <Trash2 className="w-4 h-4" />Clear
            </Button>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-card flex flex-col h-[calc(100vh-220px)] min-h-[480px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center h-full gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Hi! Main aapka Study Tutor hoon 📚</h3>
                  <p className="text-sm text-muted-foreground mt-1">Kuch bhi pucho — concepts, doubts, summary, quiz</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-2">
                  {suggestions.map((s) => (
                    <button key={s} onClick={() => setInput(s)}
                      className="text-xs text-left px-3 py-2 rounded-lg bg-accent/40 border border-border hover:bg-accent transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                )}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2">
                      <ReactMarkdown>{m.content || "..."}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {busy && messages[messages.length - 1]?.role === "user" && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-secondary">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                placeholder="Apna sawaal likho..."
                disabled={busy}
                className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
              <Button onClick={send} disabled={!input.trim() || busy} size="icon" className="rounded-full">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default StudyAIPage;
