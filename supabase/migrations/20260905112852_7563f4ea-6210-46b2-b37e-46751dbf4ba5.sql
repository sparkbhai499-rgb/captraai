-- settings singleton
CREATE TABLE public.points_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_bonus integer NOT NULL DEFAULT 150,
  video_cost integer NOT NULL DEFAULT 30,
  referral_points integer NOT NULL DEFAULT 100,
  refill_amount integer NOT NULL DEFAULT 0,
  refill_period text NOT NULL DEFAULT 'none',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.points_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.points_settings TO authenticated;
GRANT ALL ON public.points_settings TO service_role;
ALTER TABLE public.points_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points settings public read" ON public.points_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "points settings admin manage" ON public.points_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.points_settings (signup_bonus, video_cost, referral_points, refill_amount, refill_period)
VALUES (150, 30, 100, 0, 'none');

-- balances
CREATE TABLE public.user_points (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  signup_claimed boolean NOT NULL DEFAULT false,
  last_refill_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_points TO authenticated;
GRANT ALL ON public.user_points TO service_role;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin points" ON public.user_points FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage points" ON public.user_points FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ledger
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.point_transactions TO authenticated;
GRANT ALL ON public.point_transactions TO service_role;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin tx" ON public.point_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_point_tx_user ON public.point_transactions(user_id, created_at DESC);

-- referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  rewarded boolean NOT NULL DEFAULT false,
  points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin referrals" ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(),'admin'));

-- profile referral code + plan points
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code) WHERE referral_code IS NOT NULL;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS points_included integer NOT NULL DEFAULT 0;

UPDATE public.profiles SET referral_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) WHERE referral_code IS NULL;
INSERT INTO public.user_points (user_id, balance, signup_claimed)
SELECT p.user_id, 0, false FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- new user: profile + code + points row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, display_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.phone),
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
  );
  INSERT INTO public.user_points (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- internal award helper
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _amount integer, _reason text, _meta jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF _amount = 0 THEN RETURN; END IF;
  INSERT INTO public.user_points (user_id, balance) VALUES (_user_id, GREATEST(_amount,0))
  ON CONFLICT (user_id) DO UPDATE SET balance = public.user_points.balance + _amount, updated_at = now();
  INSERT INTO public.point_transactions (user_id, delta, reason, meta) VALUES (_user_id, _amount, _reason, _meta);
END;
$$;

-- my points (creates row lazily)
CREATE OR REPLACE FUNCTION public.get_my_points()
RETURNS TABLE(balance integer, signup_claimed boolean, can_claim_refill boolean, referral_code text, video_cost integer, signup_bonus integer, referral_points integer, refill_amount integer, refill_period text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.points_settings; up public.user_points; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO s FROM public.points_settings LIMIT 1;
  INSERT INTO public.user_points (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT * INTO up FROM public.user_points WHERE user_id = uid;
  UPDATE public.profiles SET referral_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
    WHERE user_id = uid AND referral_code IS NULL;
  RETURN QUERY
  SELECT up.balance, up.signup_claimed,
    (s.refill_amount > 0 AND s.refill_period <> 'none' AND (
       up.last_refill_at IS NULL OR
       (s.refill_period = 'daily' AND up.last_refill_at < now() - interval '1 day') OR
       (s.refill_period = 'monthly' AND up.last_refill_at < now() - interval '30 days')
    )),
    (SELECT p.referral_code FROM public.profiles p WHERE p.user_id = uid),
    s.video_cost, s.signup_bonus, s.referral_points, s.refill_amount, s.refill_period;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_signup_bonus()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.points_settings; uid uuid := auth.uid(); claimed boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO s FROM public.points_settings LIMIT 1;
  INSERT INTO public.user_points (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT signup_claimed INTO claimed FROM public.user_points WHERE user_id = uid FOR UPDATE;
  IF claimed THEN RAISE EXCEPTION 'Welcome bonus already claimed'; END IF;
  UPDATE public.user_points SET signup_claimed = true WHERE user_id = uid;
  PERFORM public.award_points(uid, s.signup_bonus, 'signup_bonus', NULL);
  RETURN s.signup_bonus;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_refill_points()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE s public.points_settings; uid uuid := auth.uid(); last_at timestamptz; okc boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO s FROM public.points_settings LIMIT 1;
  IF s.refill_amount <= 0 OR s.refill_period = 'none' THEN RAISE EXCEPTION 'No recurring points available'; END IF;
  INSERT INTO public.user_points (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT last_refill_at INTO last_at FROM public.user_points WHERE user_id = uid FOR UPDATE;
  okc := last_at IS NULL
      OR (s.refill_period = 'daily' AND last_at < now() - interval '1 day')
      OR (s.refill_period = 'monthly' AND last_at < now() - interval '30 days');
  IF NOT okc THEN RAISE EXCEPTION 'Already claimed — come back later'; END IF;
  UPDATE public.user_points SET last_refill_at = now() WHERE user_id = uid;
  PERFORM public.award_points(uid, s.refill_amount, 'refill_' || s.refill_period, NULL);
  RETURN s.refill_amount;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); ref uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT user_id INTO ref FROM public.profiles WHERE upper(referral_code) = upper(trim(_code));
  IF ref IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  IF ref = uid THEN RAISE EXCEPTION 'You cannot refer yourself'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = uid) THEN RAISE EXCEPTION 'Referral already applied'; END IF;
  INSERT INTO public.referrals (referrer_id, referred_id) VALUES (ref, uid);
END;
$$;

CREATE OR REPLACE FUNCTION public.spend_points(_amount integer, _reason text, _meta jsonb DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE uid uuid := auth.uid(); bal integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF public.has_role(uid,'admin') THEN RETURN -1; END IF;
  IF _amount <= 0 THEN RETURN 0; END IF;
  INSERT INTO public.user_points (user_id) VALUES (uid) ON CONFLICT DO NOTHING;
  SELECT balance INTO bal FROM public.user_points WHERE user_id = uid FOR UPDATE;
  IF bal < _amount THEN RAISE EXCEPTION 'Not enough points'; END IF;
  UPDATE public.user_points SET balance = balance - _amount, updated_at = now() WHERE user_id = uid;
  INSERT INTO public.point_transactions (user_id, delta, reason, meta) VALUES (uid, -_amount, _reason, _meta);
  RETURN bal - _amount;
END;
$$;

-- approval now grants plan points + referral reward
CREATE OR REPLACE FUNCTION public.approve_payment_request(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.payment_requests; pl public.plans; s public.points_settings; refrow public.referrals;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO r FROM public.payment_requests WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.payment_requests SET status = 'approved', updated_at = now() WHERE id = _id;
  INSERT INTO public.subscriptions (user_id, plan_id, status, expires_at)
  VALUES (r.user_id, r.plan_id, 'active', now() + interval '30 days');

  SELECT * INTO pl FROM public.plans WHERE id = r.plan_id;
  SELECT * INTO s FROM public.points_settings LIMIT 1;
  IF COALESCE(pl.points_included,0) > 0 THEN
    PERFORM public.award_points(r.user_id, pl.points_included, 'plan_purchase', jsonb_build_object('plan', pl.name));
  END IF;

  SELECT * INTO refrow FROM public.referrals WHERE referred_id = r.user_id AND rewarded = false;
  IF refrow.id IS NOT NULL AND COALESCE(s.referral_points,0) > 0 THEN
    PERFORM public.award_points(refrow.referrer_id, s.referral_points, 'referral_reward', jsonb_build_object('referred', r.user_id));
    UPDATE public.referrals SET rewarded = true, points_awarded = s.referral_points WHERE id = refrow.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_points(_user_id uuid, _amount integer, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  PERFORM public.award_points(_user_id, _amount, COALESCE(_reason,'admin_adjust'), NULL);
END;
$$;