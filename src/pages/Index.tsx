import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";
import EmptyChat from "@/components/EmptyChat";
import LoginPage from "@/pages/LoginPage";
import NewChatDialog from "@/components/NewChatDialog";

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
}

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);

  const loadContacts = useCallback(async () => {
    if (!user) return;

    // Get contacts with their profiles
    const { data: contactsData } = await supabase
      .from("contacts")
      .select("id, contact_user_id, nickname")
      .eq("user_id", user.id);

    if (!contactsData || contactsData.length === 0) {
      setContacts([]);
      return;
    }

    const contactUserIds = contactsData.map((c) => c.contact_user_id);

    // Get profiles for all contacts
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, status_text, phone")
      .in("user_id", contactUserIds);

    // Get last messages and unread counts
    const enrichedContacts: ContactWithProfile[] = await Promise.all(
      contactsData.map(async (contact) => {
        const profile = profiles?.find((p) => p.user_id === contact.contact_user_id) || null;

        // Get last message
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`
          )
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        // Get unread count
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
          profile: profile
            ? {
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
                status_text: profile.status_text,
                phone: profile.phone,
              }
            : null,
          lastMessage: lastMsg?.content || "",
          lastMessageTime: lastMsg?.created_at
            ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "",
          unread: count || 0,
          online: false,
        };
      })
    );

    setContacts(enrichedContacts);
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
          data.map((m) => ({
            id: m.id,
            contactId: contactUserId,
            text: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            sent: m.sender_id === user.id,
          }))
        );

        // Mark as read
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
    if (!selectedId || !user) return;
    const contact = contacts.find((c) => c.id === selectedId);
    if (contact) loadMessages(contact.contact_user_id);
  }, [selectedId, user, contacts, loadMessages]);

  // Real-time messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id || msg.receiver_id === user.id) {
            loadContacts();
            const selectedContact = contacts.find((c) => c.id === selectedId);
            if (
              selectedContact &&
              (msg.sender_id === selectedContact.contact_user_id ||
                msg.receiver_id === selectedContact.contact_user_id)
            ) {
              loadMessages(selectedContact.contact_user_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedId, contacts, loadContacts, loadMessages]);

  const handleSend = async (text: string) => {
    if (!user || !selectedId) return;
    const contact = contacts.find((c) => c.id === selectedId);
    if (!contact) return;

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: contact.contact_user_id,
      content: text,
    });
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

  // Map contacts to sidebar format
  const sidebarContacts = contacts.map((c) => ({
    id: c.id,
    name: c.nickname || c.profile?.display_name || c.profile?.phone || "Unknown",
    avatar: (c.nickname || c.profile?.display_name || "?").slice(0, 2).toUpperCase(),
    avatarUrl: c.profile?.avatar_url || null,
    lastMessage: c.lastMessage,
    time: c.lastMessageTime,
    unread: c.unread,
    online: c.online,
  }));

  const selectedContact = contacts.find((c) => c.id === selectedId);
  const chatContact = selectedContact
    ? {
        id: selectedContact.id,
        name:
          selectedContact.nickname ||
          selectedContact.profile?.display_name ||
          selectedContact.profile?.phone ||
          "Unknown",
        avatar: (
          selectedContact.nickname ||
          selectedContact.profile?.display_name ||
          "?"
        )
          .slice(0, 2)
          .toUpperCase(),
        avatarUrl: selectedContact.profile?.avatar_url || null,
        lastMessage: selectedContact.lastMessage,
        time: selectedContact.lastMessageTime,
        unread: selectedContact.unread,
        online: selectedContact.online,
      }
    : null;

  return (
    <div className="h-screen flex bg-background w-full">
      {!selectedId ? (
        <div className="flex w-full h-full">
          <ChatSidebar
            contacts={sidebarContacts}
            selectedId={selectedId}
            onSelect={setSelectedId}
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
              onBack={() => setSelectedId(null)}
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
