import { Search, MessageCirclePlus, MoreVertical, Settings, User, Shield, Users, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Contact } from "@/data/contacts";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChatSidebarProps {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChat?: () => void;
}

const ChatSidebar = ({ contacts, selectedId, onSelect, onNewChat }: ChatSidebarProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      setIsAdmin(data?.some((r) => r.role === "admin") || false);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const menuItems = [
    { label: "New Chat", icon: MessageCirclePlus, action: () => onNewChat?.() },
    { label: "Create Group", icon: Users, action: () => navigate("/create-group") },
    { label: "Create Community", icon: Globe, action: () => navigate("/create-community") },
    { label: "Profile", icon: User, action: () => navigate("/profile") },
    { label: "Settings", icon: Settings, action: () => navigate("/settings") },
    ...(isAdmin ? [{ label: "Admin Panel", icon: Shield, action: () => navigate("/admin") }] : []),
  ];

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary">
        <h1 className="text-lg font-bold text-primary-foreground tracking-wide">
          W8sap
        </h1>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full hover:bg-primary-foreground/10 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-primary-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card rounded-lg shadow-lg border border-border z-50 py-1 overflow-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.action();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
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
            <div className="relative flex-shrink-0">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden",
                contact.type === "group" ? "bg-accent text-accent-foreground" :
                contact.type === "community" ? "bg-primary/30 text-primary" :
                "bg-primary/20 text-accent-foreground"
              )}>
                {contact.avatarUrl ? (
                  <img src={contact.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : contact.type === "group" ? (
                  <Users className="w-5 h-5" />
                ) : contact.type === "community" ? (
                  <Globe className="w-5 h-5" />
                ) : (
                  contact.avatar
                )}
              </div>
              {contact.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-online border-2 border-card" />
              )}
            </div>
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
