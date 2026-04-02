
-- Add banned column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;

-- Create groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view groups" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Group creator can update" ON public.groups FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Group creator can delete" ON public.groups FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

-- Communities table
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  created_by uuid NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public communities" ON public.communities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create communities" ON public.communities FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator can update community" ON public.communities FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Creator can delete community" ON public.communities FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Community members
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view community members" ON public.community_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join communities" ON public.community_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave communities" ON public.community_members FOR DELETE TO authenticated USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.community_members cm WHERE cm.community_id = community_members.community_id AND cm.user_id = auth.uid() AND cm.role = 'admin'));
