
-- 1. Add price to batches
ALTER TABLE public.batches ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;

-- 2. Payment settings (singleton — admin's UPI + QR)
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text,
  qr_image_url text,
  instructions text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed views settings" ON public.payment_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.payment_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.payment_settings (upi_id, instructions) VALUES (NULL, 'Pay using the QR or UPI ID above, then upload payment screenshot and enter UTR/Transaction ID.');

-- 3. Subscription plans
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  duration_days integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views active plans" ON public.subscription_plans FOR SELECT TO authenticated
  USING (is_active OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 4. User subscriptions
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subs" ON public.user_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage subs" ON public.user_subscriptions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 5. Payment requests
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('batch','subscription')),
  batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  utr text NOT NULL,
  screenshot_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own requests" ON public.payment_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users create own requests" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Admins update requests" ON public.payment_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete requests" ON public.payment_requests FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'));

-- 6. Helper: active subscription check
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_subscriptions WHERE user_id=_user_id AND expires_at > now())
$$;

-- 7. Update is_enrolled to also grant access to active subscribers
CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id uuid, _batch_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.batch_enrollments WHERE user_id=_user_id AND batch_id=_batch_id)
      OR public.has_active_subscription(_user_id)
$$;

-- 8. Trigger: when payment_request is approved, auto-enroll / auto-activate sub
CREATE OR REPLACE FUNCTION public.process_payment_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _dur int;
BEGIN
  IF NEW.status = 'approved' AND OLD.status <> 'approved' THEN
    IF NEW.type = 'batch' AND NEW.batch_id IS NOT NULL THEN
      INSERT INTO public.batch_enrollments(user_id, batch_id) VALUES (NEW.user_id, NEW.batch_id)
        ON CONFLICT DO NOTHING;
    ELSIF NEW.type = 'subscription' AND NEW.plan_id IS NOT NULL THEN
      SELECT duration_days INTO _dur FROM public.subscription_plans WHERE id = NEW.plan_id;
      INSERT INTO public.user_subscriptions(user_id, plan_id, expires_at)
      VALUES (NEW.user_id, NEW.plan_id, now() + (_dur || ' days')::interval);
    END IF;
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_process_payment_approval BEFORE UPDATE ON public.payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.process_payment_approval();

-- 9. Unique enrollment to prevent duplicates
ALTER TABLE public.batch_enrollments ADD CONSTRAINT batch_enrollments_user_batch_unique UNIQUE (user_id, batch_id);
