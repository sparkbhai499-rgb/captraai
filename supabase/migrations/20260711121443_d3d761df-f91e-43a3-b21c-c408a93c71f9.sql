
-- payment requests
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  amount_inr integer NOT NULL,
  upi_ref text,
  screenshot_path text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_requests TO authenticated;
GRANT ALL ON public.payment_requests TO service_role;

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own or admin select" ON public.payment_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own insert" ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin update" ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete" ON public.payment_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_requests_updated
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- allow admins to manage plans
CREATE POLICY "admin insert plans" ON public.plans FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update plans" ON public.plans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete plans" ON public.plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- storage policies for payment-proofs bucket (user upload own; admin read all)
CREATE POLICY "users upload own proof" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users read own proof" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

-- approve payment: creates active subscription (30d)
CREATE OR REPLACE FUNCTION public.approve_payment_request(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.payment_requests;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.payment_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.payment_requests SET status = 'approved', updated_at = now() WHERE id = _id;
  INSERT INTO public.subscriptions (user_id, plan_id, status, expires_at)
  VALUES (r.user_id, r.plan_id, 'active', now() + interval '30 days');
END;
$$;

-- count user's approved active subscriptions
CREATE OR REPLACE FUNCTION public.user_has_active_plan(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;
