CREATE OR REPLACE FUNCTION public.process_payment_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _dur int;
BEGIN
  -- Granting access on transition INTO approved
  IF NEW.status = 'approved' AND COALESCE(OLD.status,'') <> 'approved' THEN
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

  -- Revoking access when admin moves OUT of approved (approved -> rejected/pending)
  IF COALESCE(OLD.status,'') = 'approved' AND NEW.status <> 'approved' THEN
    IF NEW.type = 'batch' AND NEW.batch_id IS NOT NULL THEN
      DELETE FROM public.batch_enrollments
        WHERE user_id = NEW.user_id AND batch_id = NEW.batch_id;
    ELSIF NEW.type = 'subscription' AND NEW.plan_id IS NOT NULL THEN
      DELETE FROM public.user_subscriptions
        WHERE user_id = NEW.user_id AND plan_id = NEW.plan_id;
    END IF;
    NEW.reviewed_at := now();
    NEW.reviewed_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS payment_request_review ON public.payment_requests;
CREATE TRIGGER payment_request_review
BEFORE UPDATE ON public.payment_requests
FOR EACH ROW EXECUTE FUNCTION public.process_payment_approval();