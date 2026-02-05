-- Fix security issues: Remove group-based profile access and consolidate SELECT policies
-- Since groups have been removed from the app, users should only see their own profiles

-- Drop the conflicting/unnecessary policies
DROP POLICY IF EXISTS "Users can view own and group member profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single, secure SELECT policy - users can ONLY view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);