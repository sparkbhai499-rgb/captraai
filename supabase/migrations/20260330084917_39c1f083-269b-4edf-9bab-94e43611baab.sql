ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_unique UNIQUE (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);