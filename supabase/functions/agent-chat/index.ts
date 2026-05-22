// Public endpoint: chat with a user-created AI agent (embeddable on any website)
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { agent_id, message, conversation_id, visitor_id, visitor_name, origin } = await req.json();
    if (!agent_id || typeof message !== "string" || !message.trim()) {
      return json({ error: "agent_id and message required" }, 400);
    }
    if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

    // Load agent (only public ones can be chatted with anonymously)
    const { data: agent, error: aErr } = await supabase
      .from("my_agents").select("*").eq("id", agent_id).maybeSingle();
    if (aErr || !agent) return json({ error: "Agent not found" }, 404);
    if (!agent.is_public) return json({ error: "Agent is private" }, 403);

    // Get or create conversation
    let convId = conversation_id as string | undefined;
    if (!convId) {
      const { data: created, error: cErr } = await supabase
        .from("my_agent_conversations")
        .insert({ agent_id, visitor_id, visitor_name, origin, last_message: message, last_message_at: new Date().toISOString() })
        .select().single();
      if (cErr) return json({ error: cErr.message }, 500);
      convId = created.id;
    } else {
      await supabase.from("my_agent_conversations")
        .update({ last_message: message, last_message_at: new Date().toISOString() })
        .eq("id", convId);
    }

    // Save user message
    await supabase.from("my_agent_messages").insert({ conversation_id: convId, role: "user", content: message });

    // History (last 30)
    const { data: history } = await supabase
      .from("my_agent_messages").select("role, content")
      .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(30);

    const systemContent = agent.knowledge
      ? `${agent.system_prompt}\n\nKnowledge base (use this to answer questions):\n${agent.knowledge}`
      : agent.system_prompt;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: agent.model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemContent },
          ...(history || []).map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      if (aiRes.status === 429) return json({ error: "Rate limited, try again shortly" }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted" }, 402);
      return json({ error: "AI request failed" }, 500);
    }
    const aiJson = await aiRes.json();
    const reply = aiJson.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't generate a reply.";

    await supabase.from("my_agent_messages").insert({ conversation_id: convId, role: "assistant", content: reply });
    await supabase.from("my_agent_conversations")
      .update({ last_message: reply, last_message_at: new Date().toISOString() })
      .eq("id", convId);

    return json({ conversation_id: convId, reply });
  } catch (e) {
    console.error("agent-chat error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
