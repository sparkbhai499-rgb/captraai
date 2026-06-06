
-- Protected (super) admin support + better RLS
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false;

-- Mark current oldest admin as super
UPDATE public.user_roles SET is_super = true
WHERE role = 'admin'
  AND user_id = (
    SELECT ur.user_id FROM public.user_roles ur
    JOIN auth.users u ON u.id = ur.user_id
    WHERE ur.role = 'admin' ORDER BY u.created_at ASC LIMIT 1
  );

-- Replace admin policy: admins can manage roles, but not modify/delete super admin rows
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND is_super = false);

CREATE POLICY "Admins update non-super roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_super = false)
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND is_super = false);

CREATE POLICY "Admins delete non-super roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_super = false);

-- Allow admins to view all roles (for user mgmt UI)
DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
