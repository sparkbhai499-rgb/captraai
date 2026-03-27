import { useState, useCallback } from "react";
import ChatSidebar from "@/components/ChatSidebar";
import ChatArea from "@/components/ChatArea";
import EmptyChat from "@/components/EmptyChat";
import { contacts as initialContacts, messages as initialMessages, Message } from "@/data/contacts";

const Index = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState(initialMessages);

  const selectedContact = initialContacts.find((c) => c.id === selectedId) || null;
  const currentMessages = selectedId ? allMessages[selectedId] || [] : [];

  const handleSend = useCallback(
    (text: string) => {
      if (!selectedId) return;
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        contactId: selectedId,
        text,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        sent: true,
      };
      setAllMessages((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] || []), newMsg],
      }));
    },
    [selectedId]
  );

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - hidden on mobile when chat is open */}
      <div className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-[380px] flex-shrink-0`}>
        <ChatSidebar
          contacts={initialContacts}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      {/* Chat Area */}
      <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
        {selectedContact ? (
          <ChatArea
            contact={selectedContact}
            messages={currentMessages}
            onSend={handleSend}
            onBack={() => setSelectedId(null)}
          />
        ) : (
          <EmptyChat />
        )}
      </div>
    </div>
  );
};

export default Index;
