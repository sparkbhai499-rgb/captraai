# WhatsApp AI Agent Plan

Ye current w8sap chat app ke alag, ek backend AI agent banayenge jo aapke Twilio WhatsApp number pe aane wale messages ka jawab automatically de — kaam manage karwana, replies dena, conversation memory ke saath.

## Kaise kaam karega

```text
User WhatsApp pe msg bhejta hai
        ↓
Twilio WhatsApp number receive karta hai
        ↓
Twilio webhook → hamara Edge Function (whatsapp-webhook)
        ↓
1. Message DB me save (conversation history ke liye)
2. Lovable AI (Gemini) ko full history + system prompt bhejo
3. AI reply generate kare
4. Twilio API ke through user ko WhatsApp reply bhejo
        ↓
User ko WhatsApp pe AI ka reply mil jata hai
```

## Aapko jo karna hoga (one-time setup)

1. **Twilio account** banao (free trial milta hai) — twilio.com
2. **WhatsApp sandbox** enable karo Twilio console me (testing ke liye instant), ya production WhatsApp number approve karwao (Meta verification chahiye, kuch din lagte hai)
3. Twilio connector connect karo (main tool se prompt karunga)
4. Webhook URL Twilio sandbox settings me paste karo (main URL dunga deploy ke baad)

## Kya banaunga

### Database
- `whatsapp_conversations` — har phone number ek conversation
- `whatsapp_messages` — saare incoming/outgoing messages with role (user/assistant), timestamp
- `agent_settings` — system prompt / agent personality (aap edit kar sako)

### Edge Functions
- **`whatsapp-webhook`** (public, no JWT) — Twilio se incoming messages receive kare, AI call kare, Twilio API se reply bheje
- **`send-whatsapp`** (admin only) — manually message bhejne ke liye (optional)

### Admin UI (current app me ek naya page `/whatsapp-agent`)
- Conversations list — har user ka phone number, last message, time
- Conversation detail — full chat history dikhe
- **System prompt editor** — aap define karo agent kaise reply kare ("Tum customer support ho, polite raho, orders manage karo, etc.")
- Agent on/off toggle
- Manual reply option (agent ko override karke khud reply bhejna)

### AI
- Lovable AI Gateway use karunga — `google/gemini-3-flash-preview` (fast, free tier)
- Full conversation history har turn pe bhejunga (memory)
- System prompt aapke editor se aayega

## Aapne kya bola: "kaam manage karwana hai"

Iska matlab agar aap chahte ho ki agent specific actions le (jaise booking confirm karna, order status check karna, calendar me event daalna) to mujhe batao kaunse "kaam" — main AI tools (function calling) add kar dunga. Abhi by default agent sirf intelligent reply dega; tools baad me incrementally add kar sakte hai.

## Cost note

- Twilio: WhatsApp sandbox free. Production messages ~$0.005/msg
- Lovable AI: workspace ka free quota use hoga, baad me usage-based

## Order of work

1. DB tables + migration
2. Twilio connector connect (aap select karoge)
3. `whatsapp-webhook` edge function
4. Admin UI page (conversations + system prompt editor)
5. Deploy aur aapko Twilio webhook URL dunga paste karne ke liye
6. Aap WhatsApp sandbox join karke test karo

Confirm karo ya koi changes batao, fir start karta hu.