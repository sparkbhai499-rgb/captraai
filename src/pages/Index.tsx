import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";
import AIChatArea from "@/components/AIChatArea";
import EmptyChat from "@/components/EmptyChat";
import LoginPage from "@/pages/LoginPage";
import NewChatDialog from "@/components/NewChatDialog";
import { Contact } from "@/data/contacts";

const W8_AI_ID = "__w8_ai__";

interface ContactWithProfile {
  id: string;
  contact_user_id: string;
  nickname: string | null;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    status_text: string | null;
    phone: string | null;
  } | null;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  online: boolean;
}

interface ChatMessage {
  id: string;
  contactId: string;
  text: string;
  time: string;
  sent: boolean;
  replyToId?: string;
}

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"contact" | "group" | "community">("contact");
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [groups, setGroups] = useState<Contact[]>([]);
  const [communities, setCommunities] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;

    const { data: contactsData } = await supabase
      .from("contacts")
      .select("id, contact_user_id, nickname")
      .eq("user_id", user.id);

    if (!contactsData || contactsData.length === 0) {
      setContacts([]);
    } else {
      const contactUserIds = contactsData.map((c) => c.contact_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, status_text, phone")
        .in("user_id", contactUserIds);

      const enrichedContacts: ContactWithProfile[] = await Promise.all(
        contactsData.map(async (contact) => {
          const profile = profiles?.find((p) => p.user_id === contact.contact_user_id) || null;
          const { data: lastMsg } = await supabase
            .from("messages")
            .select("content, created_at")
            .or(
              `and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`
            )
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", contact.contact_user_id)
            .eq("receiver_id", user.id)
            .eq("read", false);

          return {
            id: contact.id,
            contact_user_id: contact.contact_user_id,
            nickname: contact.nickname,
            profile: profile ? {
              display_name: profile.display_name,
              avatar_url: profile.avatar_url,
              status_text: profile.status_text,
              phone: profile.phone,
            } : null,
            lastMessage: lastMsg?.content || "",
            lastMessageTime: lastMsg?.created_at
              ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
            unread: count || 0,
            online: false,
          };
        })
      );
      setContacts(enrichedContacts);
    }

    // Load groups
    const { data: groupMemberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id);

    if (groupMemberships && groupMemberships.length > 0) {
      const groupIds = groupMemberships.map((gm) => gm.group_id);
      const { data: groupsData } = await supabase
        .from("groups")
        .select("id, name, avatar_url, description")
        .in("id", groupIds);

      if (groupsData) {
        setGroups(groupsData.map((g) => ({
          id: g.id,
          name: g.name,
          avatar: g.name.slice(0, 2).toUpperCase(),
          avatarUrl: g.avatar_url,
          lastMessage: g.description || "Group",
          time: "",
          unread: 0,
          online: false,
          type: "group" as const,
        })));
      }
    } else {
      setGroups([]);
    }

    // Load communities
    const { data: communityMemberships } = await supabase
      .from("community_members")
      .select("community_id")
      .eq("user_id", user.id);

    if (communityMemberships && communityMemberships.length > 0) {
      const communityIds = communityMemberships.map((cm) => cm.community_id);
      const { data: commData } = await supabase
        .from("communities")
        .select("id, name, avatar_url, description")
        .in("id", communityIds);

      if (commData) {
        setCommunities(commData.map((c) => ({
          id: c.id,
          name: c.name,
          avatar: c.name.slice(0, 2).toUpperCase(),
          avatarUrl: c.avatar_url,
          lastMessage: c.description || "Community",
          time: "",
          unread: 0,
          online: false,
          type: "community" as const,
        })));
      }
    } else {
      setCommunities([]);
    }
  }, [user]);

  const loadMessages = useCallback(
    async (contactUserId: string) => {
      if (!user) return;
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${contactUserId}),and(sender_id.eq.${contactUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            contactId: contactUserId,
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            sent: m.sender_id === user.id,
            replyToId: m.reply_to || undefined,
          }))
        );
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("sender_id", contactUserId)
          .eq("receiver_id", user.id)
          .eq("read", false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (user) loadContacts();
  }, [user, loadContacts]);

  useEffect(() => {
    if (!selectedId || !user || selectedType !== "contact") return;
    const contact = contacts.find((c) => c.id === selectedId);
    if (contact) loadMessages(contact.contact_user_id);
  }, [selectedId, user, contacts, loadMessages, selectedType]);

  // Real-time messages
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldMsg = payload.old as any;
            setMessages((prev) => prev.filter((m) => m.id !== oldMsg.id));
            return;
          }
          const msg = payload.new as any;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            const selectedContact = contacts.find((c) => c.id === selectedId);
            if (
              selectedContact &&
              (msg.sender_id === selectedContact.contact_user_id ||
                msg.receiver_id === selectedContact.contact_user_id)
            ) {
              if (payload.eventType === "INSERT") {
                const newMsg: ChatMessage = {
                  id: msg.id,
                  contactId: selectedContact.contact_user_id,
                  text: msg.content,
                  time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  sent: msg.sender_id === user.id,
                  replyToId: msg.reply_to || undefined,
                };
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  return [...prev, newMsg];
                });
                if (msg.sender_id !== user.id) {
                  supabase.from("messages").update({ read: true }).eq("id", msg.id).then();
                }
              }
            }
            loadContacts();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedId, contacts, loadContacts]);

  const handleSend = async (text: string, replyToId?: string) => {
    if (!user || !selectedId) return;
    const contact = contacts.find((c) => c.id === selectedId);
    if (!contact) return;
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: contact.contact_user_id,
      content: text,
      reply_to: replyToId || null,
    } as any);
  };

  const handleDelete = async (messageId: string) => {
    await supabase.from("messages").delete().eq("id", messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  };

  const handleSelect = (id: string, type: "contact" | "group" | "community" = "contact") => {
    setSelectedId(id);
    setSelectedType(type);
    if (type !== "contact") {
      setMessages([]);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={() => {}} />;
  }

  const aiContact: Contact = {
    id: W8_AI_ID,
    name: "W8 AI ✨",
    avatar: "AI",
    avatarUrl: null,
    lastMessage: "Built-in assistant — kuch bhi pucho",
    time: "",
    unread: 0,
    online: true,
    type: "contact" as const,
  };

  const sidebarContacts: Contact[] = [
    aiContact,
    ...contacts.map((c) => ({
      id: c.id,
      name: c.nickname || c.profile?.display_name || c.profile?.phone || "Unknown",
      avatar: (c.nickname || c.profile?.display_name || "?").slice(0, 2).toUpperCase(),
      avatarUrl: c.profile?.avatar_url || null,
      lastMessage: c.lastMessage,
      time: c.lastMessageTime,
      unread: c.unread,
      online: c.online,
      type: "contact" as const,
    })),
    ...groups,
    ...communities,
  ];

  const selectedContact = contacts.find((c) => c.id === selectedId);
  const chatContact = selectedContact
    ? {
        id: selectedContact.id,
        name: selectedContact.nickname || selectedContact.profile?.display_name || selectedContact.profile?.phone || "Unknown",
        avatar: (selectedContact.nickname || selectedContact.profile?.display_name || "?").slice(0, 2).toUpperCase(),
        avatarUrl: selectedContact.profile?.avatar_url || null,
        lastMessage: selectedContact.lastMessage,
        time: selectedContact.lastMessageTime,
        unread: selectedContact.unread,
        online: selectedContact.online,
      }
    : selectedType === "group"
    ? groups.find((g) => g.id === selectedId) || null
    : selectedType === "community"
    ? communities.find((c) => c.id === selectedId) || null
    : null;

  return (
    <div className="h-screen flex bg-background w-full">
      {!selectedId ? (
        <div className="flex w-full h-full">
          <ChatSidebar
            contacts={sidebarContacts}
            selectedId={selectedId}
            onSelect={(id) => {
              const item = sidebarContacts.find((c) => c.id === id);
              handleSelect(id, item?.type || "contact");
            }}
            onNewChat={() => setShowNewChat(true)}
          />
        </div>
      ) : (
        <div className="flex flex-1 flex-col min-w-0 w-full h-full">
          {chatContact ? (
            <ChatArea
              contact={chatContact}
              messages={messages}
              onSend={handleSend}
              onDelete={handleDelete}
              onBack={() => { setSelectedId(null); setSelectedType("contact"); }}
            />
          ) : (
            <EmptyChat />
          )}
        </div>
      )}

      <NewChatDialog
        open={showNewChat}
        onClose={() => setShowNewChat(false)}
        onChatCreated={(contactId) => {
          setShowNewChat(false);
          loadContacts();
          setSelectedId(contactId);
        }}
        currentUserId={user.id}
      />
    </div>
  );
};

export default Index;
