import { useState } from "react";
import { Send, Smile, Paperclip, Mic, Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { Contact, Message } from "@/data/contacts";
import { cn } from "@/lib/utils";

interface ChatAreaProps {
  contact: Contact;
  messages: Message[];
  onSend: (text: string) => void;
  onBack?: () => void;
}

const ChatArea = ({ contact, messages, onSend, onBack }: ChatAreaProps) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary shadow-sm">
        {onBack && (
          <button onClick={onBack} className="p-1 mr-1 md:hidden">
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
        )}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center text-sm font-bold text-primary-foreground">
            {contact.avatar}
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
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.sent ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] px-3 py-2 rounded-2xl text-sm shadow-sm relative",
                  msg.sent
                    ? "bg-bubble-sent text-bubble-sent-foreground rounded-br-sm"
                    : "bg-bubble-received text-bubble-received-foreground rounded-bl-sm"
                )}
              >
                <p className="leading-relaxed">{msg.text}</p>
                <span
                  className={cn(
                    "text-[10px] mt-1 block text-right text-muted-foreground/70"
                  )}
                >
                  {msg.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
