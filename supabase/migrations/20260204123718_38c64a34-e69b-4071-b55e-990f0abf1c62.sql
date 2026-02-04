-- Create a security definer function to check if users share a group
CREATE OR REPLACE FUNCTION public.users_share_group(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = _viewer_id AND gm2.user_id = _target_user_id
    )
$$;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Group members can view profiles of other members" ON public.profiles;

-- Create a unified policy that allows:
-- 1. Users to view their own profile
-- 2. Users to view profiles of people in their groups
CREATE POLICY "Users can view own and group member profiles"
ON public.profiles
FOR SELECT
USING (
    auth.uid() = user_id OR
    public.users_share_group(auth.uid(), user_id)
);