
-- Fix: Allow group creators to add members on behalf of others
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
CREATE POLICY "Users can add group members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.groups WHERE id = group_id AND created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'
    )
  );

-- Fix: Allow community creators to add members
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
CREATE POLICY "Users can join or be added to communities" ON public.community_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.communities WHERE id = community_id AND created_by = auth.uid()
    )
  );

-- Add reply_to column to messages for reply feature
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;

-- Allow users to delete their own sent messages
CREATE POLICY "Users can delete own messages" ON public.messages
  FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);
