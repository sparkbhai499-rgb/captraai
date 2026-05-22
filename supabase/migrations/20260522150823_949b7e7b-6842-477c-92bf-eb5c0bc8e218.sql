
CREATE TABLE public.my_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  system_prompt text NOT NULL DEFAULT 'You are a helpful AI assistant.',
  knowledge text DEFAULT '',
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  greeting text DEFAULT 'Hi! How can I help you today?',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.my_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read" ON public.my_agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owner insert" ON public.my_agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner update" ON public.my_agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owner delete" ON public.my_agents FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER my_agents_updated BEFORE UPDATE ON public.my_agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.my_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.my_agents(id) ON DELETE CASCADE,
  visitor_id text,
  visitor_name text,
  origin text,
  last_message text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.my_agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read convo" ON public.my_agent_conversations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.my_agents a WHERE a.id = agent_id AND a.user_id = auth.uid()));

CREATE TABLE public.my_agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.my_agent_conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.my_agent_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner read msg" ON public.my_agent_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.my_agent_conversations c
    JOIN public.my_agents a ON a.id = c.agent_id
    WHERE c.id = conversation_id AND a.user_id = auth.uid()
  ));

CREATE INDEX ON public.my_agent_conversations(agent_id, last_message_at DESC);
CREATE INDEX ON public.my_agent_messages(conversation_id, created_at);
