ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS extra_free_videos integer NOT NULL DEFAULT 0;

DROP FUNCTION IF EXISTS public.admin_list_users();

CREATE FUNCTION public.admin_list_users()
RETURNS TABLE (user_id uuid, email text, display_name text, phone text, created_at timestamptz, project_count bigint, extra_free_videos integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    u.email::text,
    p.display_name,
    p.phone,
    p.created_at,
    (SELECT count(*) FROM public.projects pr WHERE pr.user_id = p.user_id)::bigint AS project_count,
    p.extra_free_videos
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_free_videos(_user_id uuid, _count integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.profiles SET extra_free_videos = GREATEST(0, _count) WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_free_videos(uuid, integer) TO authenticated;