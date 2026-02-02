-- Fix: Create trigger to automatically add creator as admin when group is created
CREATE OR REPLACE FUNCTION public.handle_new_financial_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Automatically add the creator as admin member
  INSERT INTO public.group_members (
    group_id,
    user_id,
    role,
    can_manage_accounts,
    can_manage_transactions,
    can_manage_cards,
    can_manage_reminders,
    can_manage_categories,
    can_view_reports
  )
  VALUES (
    NEW.id,
    NEW.created_by,
    'admin',
    true,
    true,
    true,
    true,
    true,
    true
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_financial_group_created ON public.financial_groups;
CREATE TRIGGER on_financial_group_created
  AFTER INSERT ON public.financial_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_financial_group();

-- Also update SELECT policy for financial_groups to allow creator to see their group
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.financial_groups;
CREATE POLICY "Users can view groups they belong to"
  ON public.financial_groups
  FOR SELECT
  TO authenticated
  USING (
    is_group_member(auth.uid(), id) OR created_by = auth.uid()
  );

-- Create table for user subscriptions (Premium/Free status)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_premium BOOLEAN DEFAULT false,
  premium_started_at TIMESTAMPTZ,
  premium_expires_at TIMESTAMPTZ,
  ad_access_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON public.user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON public.user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create table for email verification tokens
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own verifications"
  ON public.email_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verifications"
  ON public.email_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verifications"
  ON public.email_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create table for phone verification codes
CREATE TABLE IF NOT EXISTS public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own phone verifications"
  ON public.phone_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone verifications"
  ON public.phone_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own phone verifications"
  ON public.phone_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);