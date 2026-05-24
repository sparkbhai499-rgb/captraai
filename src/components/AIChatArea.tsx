import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ArrowLeft, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIChatAreaProps {
  onBack?: () => void;
}

const STORAGE_KEY = "w8sap-ai-chat-history";

const AIChatArea = ({ onBack }: AIChatAreaProps) => {
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
    } catch {}
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = { role: "user", content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setIsLoading(true);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/w8sap-ai`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: nextMsgs }),
      });

      if (!resp.ok || !resp.body) {
        const errText = resp.status === 429
          ? "Bahut requests aa rahi hai, thodi der baad try kariye."
          : resp.status === 402
          ? "AI credits khatam ho gaye."
          : "Kuch issue aaya, dobara try kariye.";
        setMessages((prev) => [...prev, { role: "assistant", content: errText }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
      let started = false;
      let done = false;

      const pushChunk = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          if (!started) {
            started = true;
            return [...prev, { role: "assistant", content: assistantSoFar }];
          }
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        });
      };

      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) pushChunk(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (!started) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, koi reply nahi mila." }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, { role: "assistant", content: "Network error. Dobara try karein." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const suggestions = [
    "Ek motivational quote do",
    "Python me FizzBuzz likho",
    "Mujhe biryani recipe batao",
    "English me 'Kal milte hain' translate karo",
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary shadow-sm">
        {onBack && (
          <button onClick={onBack} className="p-1 mr-1">
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
        )}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-foreground/30 to-primary-foreground/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-primary-foreground">W8 AI</h2>
          <p className="text-xs text-primary-foreground/70">
            {isLoading ? "typing..." : "Built-in assistant"}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-xs text-primary-foreground/80 hover:text-primary-foreground px-2 py-1 rounded"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-pattern px-4 py-3 scrollbar-thin">
        <div className="flex flex-col gap-2 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Hi! Main W8 AI hoon 👋</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Kuch bhi pucho — coding, ideas, translation, advice, kuch bhi!
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md mt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-xs text-left px-3 py-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] px-3 py-2 rounded-2xl text-sm shadow-sm",
                  msg.role === "user"
                    ? "bg-bubble-sent text-bubble-sent-foreground rounded-br-sm"
                    : "bg-bubble-received text-bubble-received-foreground rounded-bl-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-pre:my-2 prose-pre:bg-foreground/5 prose-pre:text-foreground prose-code:text-foreground prose-headings:my-2">
                    <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm bg-bubble-received shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-3 py-2 bg-card border-t border-border">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="W8 AI se kuch bhi pucho..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <button
            onClick={send}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-full bg-primary hover:bg-primary/90 transition-colors flex-shrink-0 disabled:opacity-50"
          >
            <Send className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChatArea;
