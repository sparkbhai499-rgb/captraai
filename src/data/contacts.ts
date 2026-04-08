export interface Contact {
  id: string;
  name: string;
  avatar: string;
  avatarUrl?: string | null;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  type?: "contact" | "group" | "community";
}

export interface Message {
  id: string;
  contactId: string;
  text: string;
  time: string;
  sent: boolean;
}

export const contacts: Contact[] = [
  { id: "1", name: "Rahul Sharma", avatar: "RS", lastMessage: "Bhai party kab de raha hai? 🎉", time: "2:30 PM", unread: 3, online: true },
  { id: "2", name: "Priya Singh", avatar: "PS", lastMessage: "Photo bhej do please", time: "1:15 PM", unread: 0, online: true },
  { id: "3", name: "Family Group", avatar: "FG", lastMessage: "Papa: Sab theek hai?", time: "12:45 PM", unread: 12, online: false },
  { id: "4", name: "Amit Kumar", avatar: "AK", lastMessage: "Meeting 5 baje hai", time: "11:30 AM", unread: 1, online: false },
  { id: "5", name: "Sneha Patel", avatar: "SP", lastMessage: "Haha 😂😂", time: "Yesterday", unread: 0, online: true },
  { id: "6", name: "Office Group", avatar: "OG", lastMessage: "Boss: Report submit karo", time: "Yesterday", unread: 5, online: false },
  { id: "7", name: "Vikram Joshi", avatar: "VJ", lastMessage: "Cricket khelne chalega?", time: "Yesterday", unread: 0, online: false },
  { id: "8", name: "Neha Gupta", avatar: "NG", lastMessage: "Thankyou so much! ❤️", time: "Monday", unread: 0, online: true },
];

export const messages: Record<string, Message[]> = {
  "1": [
    { id: "m1", contactId: "1", text: "Bhai kya haal hai?", time: "2:00 PM", sent: false },
    { id: "m2", contactId: "1", text: "Sab badhiya! Tu bata", time: "2:05 PM", sent: true },
    { id: "m3", contactId: "1", text: "Mast hai yaar! Suno ek kaam tha", time: "2:10 PM", sent: false },
    { id: "m4", contactId: "1", text: "Bol na", time: "2:12 PM", sent: true },
    { id: "m5", contactId: "1", text: "Kal movie chalte hai, new Marvel wali aayi hai 🎬", time: "2:20 PM", sent: false },
    { id: "m6", contactId: "1", text: "Done! Evening show book kar le 👍", time: "2:22 PM", sent: true },
    { id: "m7", contactId: "1", text: "Bhai party kab de raha hai? 🎉", time: "2:30 PM", sent: false },
  ],
  "2": [
    { id: "m8", contactId: "2", text: "Hi Priya! Kaisi ho?", time: "12:30 PM", sent: true },
    { id: "m9", contactId: "2", text: "Main theek hoon! Kal ka trip kaisa raha?", time: "12:45 PM", sent: false },
    { id: "m10", contactId: "2", text: "Bohot mast tha! Bahut photos khinche", time: "1:00 PM", sent: true },
    { id: "m11", contactId: "2", text: "Photo bhej do please", time: "1:15 PM", sent: false },
  ],
  "4": [
    { id: "m12", contactId: "4", text: "Amit bhai, aaj meeting hai kya?", time: "10:00 AM", sent: true },
    { id: "m13", contactId: "4", text: "Haan bhai, 5 baje sharp", time: "10:30 AM", sent: false },
    { id: "m14", contactId: "4", text: "Presentation ready hai?", time: "11:00 AM", sent: false },
    { id: "m15", contactId: "4", text: "Almost done, bas finishing touch baaki hai", time: "11:15 AM", sent: true },
    { id: "m16", contactId: "4", text: "Meeting 5 baje hai", time: "11:30 AM", sent: false },
  ],
};
