ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS partner_lat double precision,
  ADD COLUMN IF NOT EXISTS partner_lng double precision,
  ADD COLUMN IF NOT EXISTS partner_location_at timestamptz;

ALTER TABLE public.orders REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.orders';
  END IF;
END $$;