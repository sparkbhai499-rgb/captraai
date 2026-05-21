// Public webhook for Twilio WhatsApp -> Lovable AI -> Twilio reply
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const TWILIO_API_KEY = Deno.env.get("TWILIO_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function twiml(text?: string) {
  const body = text
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${text.replace(/[<&>]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]!))}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: { ...corsHeaders, "Content-Type": "text/xml" } });
}

async function sendViaTwilio(from: string, to: string, body: string) {
  if (!TWILIO_API_KEY || !LOVABLE_API_KEY) return null;
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TWILIO_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) console.error("Twilio send failed", res.status, data);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const contentType = req.headers.get("content-type") || "";
    let from = "", to = "", body = "", messageSid = "", profileName = "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      from = String(form.get("From") || "");
      to = String(form.get("To") || "");
      body = String(form.get("Body") || "");
      messageSid = String(form.get("MessageSid") || "");
      profileName = String(form.get("ProfileName") || "");
    } else {
      const j = await req.json().catch(() => ({}));
      from = j.From || ""; to = j.To || ""; body = j.Body || ""; messageSid = j.MessageSid || ""; profileName = j.ProfileName || "";
    }

    if (!from || !body) return twiml();

    // Load settings
    const { data: settings } = await supabase.from("agent_settings").select("*").limit(1).maybeSingle();
    if (!settings?.agent_enabled) return twiml();

    // Upsert conversation
    const { data: existing } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("phone_number", from)
      .maybeSingle();

    let conv = existing;
    if (!conv) {
      const { data: created } = await supabase
        .from("whatsapp_conversations")
        .insert({ phone_number: from, display_name: profileName || from, last_message: body, last_message_at: new Date().toISOString(), unread_count: 1 })
        .select()
        .single();
      conv = created!;
    } else {
      await supabase
        .from("whatsapp_conversations")
        .update({ last_message: body, last_message_at: new Date().toISOString(), unread_count: (conv.unread_count || 0) + 1, display_name: profileName || conv.display_name })
        .eq("id", conv.id);
    }

    // Save user message
    await supabase.from("whatsapp_messages").insert({ conversation_id: conv.id, role: "user", content: body, twilio_sid: messageSid });

    if (!conv.agent_enabled) return twiml();

    // Load history (last 30)
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("role, content")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(30);

    if (!LOVABLE_API_KEY) {
      return twiml("(AI agent abhi configure nahi hua — admin se contact karein.)");
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "manual",
      },
      body: JSON.stringify({
        model: settings.model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: settings.system_prompt },
          ...(history || []).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error", aiRes.status, errText);
      const fallback = aiRes.status === 429
        ? "Bahut requests aa rahi hai, thodi der baad try kariye."
        : aiRes.status === 402
        ? "AI credits khatam ho gaye. Admin se contact karein."
        : "Kuch issue ho gaya, dobara try kariye.";
      return twiml(fallback);
    }

    const aiJson = await aiRes.json();
    const reply = aiJson.choices?.[0]?.message?.content?.trim() || "Sorry, samajh nahi aaya.";

    // Save assistant message
    await supabase.from("whatsapp_messages").insert({ conversation_id: conv.id, role: "assistant", content: reply });
    await supabase
      .from("whatsapp_conversations")
      .update({ last_message: reply, last_message_at: new Date().toISOString() })
      .eq("id", conv.id);

    // Reply via TwiML (instant) — also works without Twilio connector
    return twiml(reply);
  } catch (e) {
    console.error("Webhook error", e);
    return twiml();
  }
});
