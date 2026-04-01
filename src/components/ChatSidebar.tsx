import { Search, MessageCirclePlus, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Contact } from "@/data/contacts";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ChatSidebarProps {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
}

const ChatSidebar = ({ contacts, selectedId, onSelect, onNewChat }: ChatSidebarProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary">
        <h1 className="text-lg font-bold text-primary-foreground tracking-wide">
          W8sap
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={onNewChat} className="p-2 rounded-full hover:bg-primary/80 transition-colors">
            <MessageCirclePlus className="w-5 h-5 text-primary-foreground" />
          </button>
          <button onClick={() => navigate("/profile")} className="p-2 rounded-full hover:bg-primary/80 transition-colors">
            <User className="w-5 h-5 text-primary-foreground" />
          </button>
          <button onClick={() => navigate("/settings")} className="p-2 rounded-full hover:bg-primary/80 transition-colors">
            <Settings className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary text-secondary-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filtered.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelect(contact.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors text-left",
              selectedId === contact.id && "bg-accent"
            )}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-accent-foreground overflow-hidden">
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  contact.avatar
                )}
              </div>
              {contact.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-online border-2 border-card" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground truncate">
                  {contact.name}
                </span>
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {contact.time}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-muted-foreground truncate">
                  {contact.lastMessage}
                </span>
                {contact.unread > 0 && (
                  <span className="flex-shrink-0 ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {contact.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatSidebar;
