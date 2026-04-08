import { useState, useRef, useEffect } from "react";
import { Send, Smile, Paperclip, Mic, Phone, Video, MoreVertical, ArrowLeft, Reply, Trash2, X } from "lucide-react";
import { Contact, Message } from "@/data/contacts";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  contact: Contact;
  messages: Message[];
  onSend: (text: string, replyToId?: string) => void;
  onDelete?: (messageId: string) => void;
  onBack?: () => void;
}

const ChatArea = ({ contact, messages, onSend, onDelete, onBack }: ChatAreaProps) => {
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim(), replyTo?.id);
    setInput("");
    setReplyTo(null);
  };

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, msgId: string) => {
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const clientY = "touches" in e ? e.touches[0]?.clientY || 0 : e.clientY;
    setContextMenu({ msgId, x: clientX, y: clientY });
  };

  const handleReply = (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (msg) setReplyTo(msg);
    setContextMenu(null);
  };

  const handleDelete = (msgId: string) => {
    onDelete?.(msgId);
    setContextMenu(null);
  };

  const getReplyMessage = (replyToId: string | undefined) => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary shadow-sm">
        {onBack && (
          <button onClick={onBack} className="p-1 mr-1">
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
        )}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold text-primary-foreground overflow-hidden">
            {contact.avatarUrl ? (
              <img src={contact.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              contact.avatar
            )}
          </div>
          {contact.online && (
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-online border-2 border-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm text-primary-foreground truncate">{contact.name}</h2>
          <p className="text-xs text-primary-foreground/70">
            {contact.online ? "Online" : "Last seen recently"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <Video className="w-5 h-5 text-primary-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <Phone className="w-5 h-5 text-primary-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
            <MoreVertical className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto chat-pattern px-4 py-3 scrollbar-thin">
        <div className="flex flex-col gap-1.5 max-w-3xl mx-auto">
          {messages.map((msg) => {
            const replyMsg = getReplyMessage((msg as any).replyToId);
            return (
              <div
                key={msg.id}
                className={cn("flex", msg.sent ? "justify-end" : "justify-start")}
                onContextMenu={(e) => handleContextMenu(e, msg.id)}
                onTouchStart={(e) => {
                  const timer = setTimeout(() => handleContextMenu(e, msg.id), 500);
                  const clear = () => { clearTimeout(timer); e.currentTarget.removeEventListener("touchend", clear); };
                  e.currentTarget.addEventListener("touchend", clear);
                }}
              >
                <div
                  className={cn(
                    "max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm relative",
                    msg.sent
                      ? "bg-bubble-sent text-bubble-sent-foreground rounded-br-sm"
                      : "bg-bubble-received text-bubble-received-foreground rounded-bl-sm"
                  )}
                >
                  {replyMsg && (
                    <div className="mb-1 px-2 py-1 rounded-lg bg-foreground/5 border-l-2 border-primary text-xs">
                      <p className="font-semibold text-primary text-[10px]">{replyMsg.sent ? "You" : contact.name}</p>
                      <p className="truncate text-muted-foreground">{replyMsg.text}</p>
                    </div>
                  )}
                  <p className="leading-relaxed">{msg.text}</p>
                  <span className="text-[10px] mt-1 block text-right text-muted-foreground/70">
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 160) }}
        >
          <button
            onClick={() => handleReply(contextMenu.msgId)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <Reply className="w-4 h-4" /> Reply
          </button>
          {messages.find((m) => m.id === contextMenu.msgId)?.sent && (
            <button
              onClick={() => handleDelete(contextMenu.msgId)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-destructive hover:bg-accent transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
        </div>
      )}

      {/* Reply Bar */}
      {replyTo && (
        <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-2">
          <div className="flex-1 px-3 py-1.5 rounded-lg bg-secondary border-l-2 border-primary">
            <p className="text-[10px] font-semibold text-primary">{replyTo.sent ? "You" : contact.name}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.text}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2 bg-card border-t border-border">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <button className="p-2 rounded-full hover:bg-accent transition-colors flex-shrink-0">
            <Smile className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2 rounded-full hover:bg-accent transition-colors flex-shrink-0">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {input.trim() ? (
            <button
              onClick={handleSend}
              className="p-2.5 rounded-full bg-primary hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              <Send className="w-5 h-5 text-primary-foreground" />
            </button>
          ) : (
            <button className="p-2.5 rounded-full bg-primary hover:bg-primary/90 transition-colors flex-shrink-0">
              <Mic className="w-5 h-5 text-primary-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
