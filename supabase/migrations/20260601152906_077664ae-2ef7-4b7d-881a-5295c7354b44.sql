
-- Batches
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_image text,
  created_by uuid NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batches TO authenticated;
GRANT ALL ON public.batches TO service_role;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authed can view published batches" ON public.batches
  FOR SELECT TO authenticated USING (is_published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert batches" ON public.batches
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update batches" ON public.batches
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete batches" ON public.batches
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_batches_updated BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enrollments
CREATE TABLE public.batch_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(batch_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.batch_enrollments TO authenticated;
GRANT ALL ON public.batch_enrollments TO service_role;
ALTER TABLE public.batch_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own or admin all" ON public.batch_enrollments
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Users self enroll" ON public.batch_enrollments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unenroll self or admin" ON public.batch_enrollments
  FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- Helper: is_enrolled
CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id uuid, _batch_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.batch_enrollments WHERE user_id=_user_id AND batch_id=_batch_id)
$$;

-- Contents (PDFs, videos, notes)
CREATE TABLE public.batch_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pdf','video','note')),
  title text NOT NULL,
  description text,
  file_path text,
  video_url text,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_contents TO authenticated;
GRANT ALL ON public.batch_contents TO service_role;
ALTER TABLE public.batch_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled or admin view content" ON public.batch_contents
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.is_enrolled(auth.uid(), batch_id));
CREATE POLICY "Admin manage content insert" ON public.batch_contents
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage content update" ON public.batch_contents
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manage content delete" ON public.batch_contents
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Announcements
CREATE TABLE public.batch_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.batch_announcements TO authenticated;
GRANT ALL ON public.batch_announcements TO service_role;
ALTER TABLE public.batch_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enrolled or admin view announcements" ON public.batch_announcements
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.is_enrolled(auth.uid(), batch_id));
CREATE POLICY "Admin insert announcements" ON public.batch_announcements
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete announcements" ON public.batch_announcements
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Storage bucket for PDFs (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('batch-pdfs','batch-pdfs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admin upload pdfs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id='batch-pdfs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update pdfs" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id='batch-pdfs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete pdfs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id='batch-pdfs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin read pdfs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id='batch-pdfs' AND public.has_role(auth.uid(),'admin'));
