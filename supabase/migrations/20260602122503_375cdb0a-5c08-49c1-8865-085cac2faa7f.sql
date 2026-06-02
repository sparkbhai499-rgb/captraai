
CREATE POLICY "Users upload own payment proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own payment proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin')));
CREATE POLICY "Admins delete payment proofs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Authed upload thumbnails to avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND has_role(auth.uid(),'admin') AND (storage.foldername(name))[1] = 'batch-thumbnails');
