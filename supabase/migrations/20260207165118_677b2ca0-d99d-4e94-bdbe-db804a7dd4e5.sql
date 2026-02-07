
-- 1. Add DELETE policy on login_history so users can delete their own records
CREATE POLICY "Users can delete their own login history"
  ON public.login_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. Tighten group_invites SELECT policy to only show invites where user is the invitee
-- First drop the existing permissive SELECT policies if any, then create a strict one
-- We'll create a more restrictive policy that only allows seeing your own invites or invites you sent
DO $$
BEGIN
  -- Drop existing SELECT policies on group_invites to replace them
  DROP POLICY IF EXISTS "Users can view invites for their email" ON public.group_invites;
  DROP POLICY IF EXISTS "Users can view their sent invites" ON public.group_invites;
  DROP POLICY IF EXISTS "Members can view group invites" ON public.group_invites;
END $$;

-- Only allow users to see invites sent to their email
CREATE POLICY "Users can view invites for their email"
  ON public.group_invites
  FOR SELECT
  USING (invited_email = public.get_auth_email() OR invited_by = auth.uid());
