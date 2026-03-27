
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  status_text TEXT DEFAULT 'Hey there! I am using Message Hub',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create contacts table
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, contact_user_id)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add contacts" ON public.contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete contacts" ON public.contacts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own received messages" ON public.messages FOR UPDATE TO authenticated 
  USING (auth.uid() = receiver_id);

-- Indexes
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_contacts_user ON public.contacts(user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, phone, display_name)
  VALUES (NEW.id, NEW.phone, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.phone));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
