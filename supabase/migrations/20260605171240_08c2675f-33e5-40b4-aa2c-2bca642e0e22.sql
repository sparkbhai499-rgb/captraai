
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id uuid,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  address text NOT NULL,
  items_summary text NOT NULL,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','picked_up','delivered','cancelled')),
  delivery_otp text NOT NULL DEFAULT lpad((floor(random()*10000))::int::text, 4, '0'),
  assigned_to uuid,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  payout numeric(10,2) NOT NULL DEFAULT 40,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create order"
  ON public.orders FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Customer reads own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (customer_user_id = auth.uid());

CREATE POLICY "Delivery sees pending and own"
  ON public.orders FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'delivery')
    AND (status = 'pending' OR assigned_to = auth.uid())
  );

CREATE POLICY "Delivery updates own/pending"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'delivery')
    AND (status = 'pending' OR assigned_to = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'delivery')
    AND (assigned_to = auth.uid() OR assigned_to IS NULL)
  );

CREATE POLICY "Admin all orders"
  ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.verify_delivery_otp(_order_id uuid, _otp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Order not found');
  END IF;
  IF _o.assigned_to <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not your order');
  END IF;
  IF _o.status <> 'picked_up' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Pehle pickup mark karo');
  END IF;
  IF _o.delivery_otp <> _otp THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Wrong OTP');
  END IF;
  UPDATE public.orders
    SET status = 'delivered', delivered_at = now()
    WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_delivery_otp(uuid, text) TO authenticated;
