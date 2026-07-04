
-- ============ DROP OLD ============
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.payment_requests CASCADE;
DROP TABLE IF EXISTS public.payment_settings CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.batch_announcements CASCADE;
DROP TABLE IF EXISTS public.batch_contents CASCADE;
DROP TABLE IF EXISTS public.batch_enrollments CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.whatsapp_conversations CASCADE;
DROP TABLE IF EXISTS public.my_agent_messages CASCADE;
DROP TABLE IF EXISTS public.my_agent_conversations CASCADE;
DROP TABLE IF EXISTS public.my_agents CASCADE;
DROP TABLE IF EXISTS public.communities CASCADE;
DROP TABLE IF EXISTS public.community_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.agent_settings CASCADE;

DROP FUNCTION IF EXISTS public.verify_delivery_otp(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_active_subscription(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_enrolled(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.process_payment_approval() CASCADE;

-- Reset role enum values used: keep 'admin', drop 'delivery' rows
DELETE FROM public.user_roles WHERE role::text <> 'admin';

-- ============ NEW: PROJECTS ============
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled project',
  video_path TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_sec INT DEFAULT 0,
  language TEXT DEFAULT 'auto',
  status TEXT NOT NULL DEFAULT 'uploaded',
  transcript_text TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

-- ============ CAPTIONS ============
CREATE TABLE public.captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  idx INT NOT NULL,
  start_ms INT NOT NULL,
  end_ms INT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  speaker TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_captions_project ON public.captions(project_id, idx);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.captions TO authenticated;
GRANT ALL ON public.captions TO service_role;
ALTER TABLE public.captions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "captions via project" ON public.captions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

-- ============ YT METADATA ============
CREATE TABLE public.yt_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  hashtags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  tone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.yt_metadata TO authenticated;
GRANT ALL ON public.yt_metadata TO service_role;
ALTER TABLE public.yt_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "yt via project" ON public.yt_metadata FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()));

-- ============ PLANS ============
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_inr INT NOT NULL DEFAULT 0,
  minutes_included INT NOT NULL DEFAULT 0,
  features TEXT[] DEFAULT '{}',
  is_popular BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans public read" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.plans (slug, name, price_inr, minutes_included, features, is_popular, sort_order) VALUES
('free','Free', 0, 15, ARRAY['15 minutes / month','Auto AI captions','SRT / VTT / TXT export','Standard languages'], false, 1),
('pro','Pro', 499, 300, ARRAY['300 minutes / month','All languages incl. Hinglish','YouTube AI kit','Burn-in captions','Priority speed'], true, 2),
('studio','Studio', 1499, 1500, ARRAY['1500 minutes / month','Team seats','4K exports','API access','Premium support'], false, 3);

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subs" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage subs" ON public.subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CONTACT MESSAGES ============
CREATE TABLE public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.contact_messages TO anon, authenticated;
GRANT SELECT, DELETE ON public.contact_messages TO authenticated;
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit contact" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read contact" ON public.contact_messages FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete contact" ON public.contact_messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIGGERS ============
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_yt_updated BEFORE UPDATE ON public.yt_metadata
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
