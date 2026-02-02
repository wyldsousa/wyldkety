-- Fix RLS policies that incorrectly access auth.users table
-- Create a security definer function to safely get the current user's email

-- Create helper function to get current user's email
CREATE OR REPLACE FUNCTION public.get_auth_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT email FROM auth.users WHERE id = auth.uid()
$$;

-- Drop the problematic policies on group_invites
DROP POLICY IF EXISTS "Users can view their invites" ON public.group_invites;
DROP POLICY IF EXISTS "Users can update their invites" ON public.group_invites;

-- Recreate policies using the safe function
CREATE POLICY "Users can view their invites" 
ON public.group_invites 
FOR SELECT 
USING (
    is_group_member(auth.uid(), group_id) 
    OR (invited_email = public.get_auth_email())
);

CREATE POLICY "Users can update their invites" 
ON public.group_invites 
FOR UPDATE 
USING (
    is_group_admin(auth.uid(), group_id) 
    OR (invited_email = public.get_auth_email())
);

-- Add function to delete a group (only admin can do this)
CREATE OR REPLACE FUNCTION public.delete_financial_group(_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify user is admin of the group
    IF NOT is_group_admin(auth.uid(), _group_id) THEN
        RAISE EXCEPTION 'Only group admin can delete the group';
    END IF;
    
    -- Delete all group members first
    DELETE FROM public.group_members WHERE group_id = _group_id;
    
    -- Delete all pending invites
    DELETE FROM public.group_invites WHERE group_id = _group_id;
    
    -- Delete the group itself
    DELETE FROM public.financial_groups WHERE id = _group_id;
    
    RETURN true;
END;
$$;

-- Add function to update group details
CREATE OR REPLACE FUNCTION public.update_financial_group(
    _group_id uuid, 
    _name text, 
    _description text DEFAULT NULL
)
RETURNS public.financial_groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result public.financial_groups;
BEGIN
    -- Verify user is admin of the group
    IF NOT is_group_admin(auth.uid(), _group_id) THEN
        RAISE EXCEPTION 'Only group admin can update the group';
    END IF;
    
    UPDATE public.financial_groups 
    SET name = _name, 
        description = _description,
        updated_at = now()
    WHERE id = _group_id
    RETURNING * INTO result;
    
    RETURN result;
END;
$$;