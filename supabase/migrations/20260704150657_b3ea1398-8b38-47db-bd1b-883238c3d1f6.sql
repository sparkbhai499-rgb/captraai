
-- Storage policies for videos bucket
CREATE POLICY "users upload own videos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users read own videos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "users delete own videos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Tighten SECURITY DEFINER function execute grants
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
