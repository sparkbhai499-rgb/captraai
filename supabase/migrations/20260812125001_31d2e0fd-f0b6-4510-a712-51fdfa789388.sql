
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id text NOT NULL DEFAULT '',
  upi_name text NOT NULL DEFAULT '',
  note text,
  qr_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_settings TO authenticated;
GRANT ALL ON public.payment_settings TO service_role;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment settings public read" ON public.payment_settings;
CREATE POLICY "payment settings public read" ON public.payment_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "payment settings admin manage" ON public.payment_settings;
CREATE POLICY "payment settings admin manage" ON public.payment_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.payment_settings (upi_id, upi_name, note)
SELECT 'captraai@upi', 'Captra AI', 'Pay and upload screenshot'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings);
