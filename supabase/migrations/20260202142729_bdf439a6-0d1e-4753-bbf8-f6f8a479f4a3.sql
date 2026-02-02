-- Fix RLS policies for financial_groups table
-- Drop existing restrictive policies and recreate as permissive

DROP POLICY IF EXISTS "Users can create groups" ON public.financial_groups;
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.financial_groups;
DROP POLICY IF EXISTS "Admins can update their groups" ON public.financial_groups;
DROP POLICY IF EXISTS "Admins can delete their groups" ON public.financial_groups;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Users can create groups" 
ON public.financial_groups 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view groups they belong to" 
ON public.financial_groups 
FOR SELECT 
TO authenticated
USING (is_group_member(auth.uid(), id));

CREATE POLICY "Admins can update their groups" 
ON public.financial_groups 
FOR UPDATE 
TO authenticated
USING (is_group_admin(auth.uid(), id));

CREATE POLICY "Admins can delete their groups" 
ON public.financial_groups 
FOR DELETE 
TO authenticated
USING (is_group_admin(auth.uid(), id));

-- Fix RLS policies for group_members table
DROP POLICY IF EXISTS "Admins can add members" ON public.group_members;
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can update members" ON public.group_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.group_members;

-- Allow users to add themselves when accepting invite OR admins to add others
CREATE POLICY "Users can add members" 
ON public.group_members 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR 
  is_group_admin(auth.uid(), group_id)
);

CREATE POLICY "Members can view group members" 
ON public.group_members 
FOR SELECT 
TO authenticated
USING (is_group_member(auth.uid(), group_id));

CREATE POLICY "Admins can update members" 
ON public.group_members 
FOR UPDATE 
TO authenticated
USING (is_group_admin(auth.uid(), group_id));

CREATE POLICY "Admins can remove members" 
ON public.group_members 
FOR DELETE 
TO authenticated
USING (is_group_admin(auth.uid(), group_id));

-- Fix RLS policies for group_invites table
DROP POLICY IF EXISTS "Admins can create invites" ON public.group_invites;
DROP POLICY IF EXISTS "Members can view invites" ON public.group_invites;
DROP POLICY IF EXISTS "Admins can update invites" ON public.group_invites;
DROP POLICY IF EXISTS "Admins can delete invites" ON public.group_invites;

CREATE POLICY "Admins can create invites" 
ON public.group_invites 
FOR INSERT 
TO authenticated
WITH CHECK (is_group_admin(auth.uid(), group_id));

CREATE POLICY "Users can view their invites" 
ON public.group_invites 
FOR SELECT 
TO authenticated
USING (
  is_group_member(auth.uid(), group_id) OR 
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can update their invites" 
ON public.group_invites 
FOR UPDATE 
TO authenticated
USING (
  is_group_admin(auth.uid(), group_id) OR 
  invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Admins can delete invites" 
ON public.group_invites 
FOR DELETE 
TO authenticated
USING (is_group_admin(auth.uid(), group_id));