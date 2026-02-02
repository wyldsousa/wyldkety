-- 1. Create enum for group roles
CREATE TYPE public.group_role AS ENUM ('admin', 'member');

-- 2. Create financial_groups table
CREATE TABLE public.financial_groups (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Create group_members table with granular permissions
CREATE TABLE public.group_members (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.financial_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    role group_role NOT NULL DEFAULT 'member',
    -- Granular permissions
    can_manage_accounts BOOLEAN NOT NULL DEFAULT false,
    can_manage_transactions BOOLEAN NOT NULL DEFAULT false,
    can_manage_cards BOOLEAN NOT NULL DEFAULT false,
    can_manage_reminders BOOLEAN NOT NULL DEFAULT false,
    can_manage_categories BOOLEAN NOT NULL DEFAULT false,
    can_view_reports BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (group_id, user_id)
);

-- 4. Create group_invites table
CREATE TABLE public.group_invites (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    group_id UUID NOT NULL REFERENCES public.financial_groups(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID NOT NULL,
    role group_role NOT NULL DEFAULT 'member',
    -- Default permissions for new member
    can_manage_accounts BOOLEAN NOT NULL DEFAULT false,
    can_manage_transactions BOOLEAN NOT NULL DEFAULT false,
    can_manage_cards BOOLEAN NOT NULL DEFAULT false,
    can_manage_reminders BOOLEAN NOT NULL DEFAULT false,
    can_manage_categories BOOLEAN NOT NULL DEFAULT false,
    can_view_reports BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (group_id, invited_email, status)
);

-- 5. Add group_id and created_by_user_id to all financial tables
ALTER TABLE public.bank_accounts ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;
ALTER TABLE public.bank_accounts ADD COLUMN created_by_user_id UUID;

ALTER TABLE public.transactions ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN created_by_user_id UUID;

ALTER TABLE public.credit_cards ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;
ALTER TABLE public.credit_cards ADD COLUMN created_by_user_id UUID;

ALTER TABLE public.credit_card_invoices ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;

ALTER TABLE public.credit_card_transactions ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;
ALTER TABLE public.credit_card_transactions ADD COLUMN created_by_user_id UUID;

ALTER TABLE public.reminders ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;
ALTER TABLE public.reminders ADD COLUMN created_by_user_id UUID;

ALTER TABLE public.categories ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;

ALTER TABLE public.monthly_reports ADD COLUMN group_id UUID REFERENCES public.financial_groups(id) ON DELETE CASCADE;

-- 6. Add verification fields to profiles
ALTER TABLE public.profiles ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN phone_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN email_verification_token TEXT;
ALTER TABLE public.profiles ADD COLUMN phone_verification_code TEXT;
ALTER TABLE public.profiles ADD COLUMN email_verification_sent_at TIMESTAMP WITH TIME ZONE;

-- 7. Enable RLS on new tables
ALTER TABLE public.financial_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- 8. Create helper function to check if user is member of group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE user_id = _user_id AND group_id = _group_id
    )
$$;

-- 9. Create helper function to check if user is admin of group
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
    )
$$;

-- 10. Create helper function to check specific permission
CREATE OR REPLACE FUNCTION public.has_group_permission(_user_id UUID, _group_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.group_members
        WHERE user_id = _user_id 
        AND group_id = _group_id
        AND (
            role = 'admin' OR
            CASE _permission
                WHEN 'manage_accounts' THEN can_manage_accounts
                WHEN 'manage_transactions' THEN can_manage_transactions
                WHEN 'manage_cards' THEN can_manage_cards
                WHEN 'manage_reminders' THEN can_manage_reminders
                WHEN 'manage_categories' THEN can_manage_categories
                WHEN 'view_reports' THEN can_view_reports
                ELSE false
            END
        )
    )
$$;

-- 11. RLS policies for financial_groups
CREATE POLICY "Users can view groups they belong to"
ON public.financial_groups FOR SELECT
USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Users can create groups"
ON public.financial_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their groups"
ON public.financial_groups FOR UPDATE
USING (public.is_group_admin(auth.uid(), id));

CREATE POLICY "Admins can delete their groups"
ON public.financial_groups FOR DELETE
USING (public.is_group_admin(auth.uid(), id));

-- 12. RLS policies for group_members
CREATE POLICY "Members can view group members"
ON public.group_members FOR SELECT
USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Admins can add members"
ON public.group_members FOR INSERT
WITH CHECK (public.is_group_admin(auth.uid(), group_id) OR auth.uid() = user_id);

CREATE POLICY "Admins can update members"
ON public.group_members FOR UPDATE
USING (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Admins can remove members"
ON public.group_members FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));

-- 13. RLS policies for group_invites
CREATE POLICY "Members can view invites"
ON public.group_invites FOR SELECT
USING (public.is_group_member(auth.uid(), group_id) OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can create invites"
ON public.group_invites FOR INSERT
WITH CHECK (public.is_group_admin(auth.uid(), group_id));

CREATE POLICY "Admins can update invites"
ON public.group_invites FOR UPDATE
USING (public.is_group_admin(auth.uid(), group_id) OR invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Admins can delete invites"
ON public.group_invites FOR DELETE
USING (public.is_group_admin(auth.uid(), group_id));

-- 14. Drop old RLS policies and create new ones for bank_accounts
DROP POLICY IF EXISTS "Users can view own accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.bank_accounts;

CREATE POLICY "Users can view accounts"
ON public.bank_accounts FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert accounts"
ON public.bank_accounts FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_accounts'))
);

CREATE POLICY "Users can update accounts"
ON public.bank_accounts FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_accounts'))
);

CREATE POLICY "Users can delete accounts"
ON public.bank_accounts FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_accounts'))
);

-- 15. Update RLS for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users can view transactions"
ON public.transactions FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert transactions"
ON public.transactions FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_transactions'))
);

CREATE POLICY "Users can update transactions"
ON public.transactions FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_transactions'))
);

CREATE POLICY "Users can delete transactions"
ON public.transactions FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_transactions'))
);

-- 16. Update RLS for credit_cards
DROP POLICY IF EXISTS "Users can view own cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can insert own cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can update own cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can delete own cards" ON public.credit_cards;

CREATE POLICY "Users can view cards"
ON public.credit_cards FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert cards"
ON public.credit_cards FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

CREATE POLICY "Users can update cards"
ON public.credit_cards FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

CREATE POLICY "Users can delete cards"
ON public.credit_cards FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

-- 17. Update RLS for credit_card_invoices
DROP POLICY IF EXISTS "Users can view own invoices" ON public.credit_card_invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON public.credit_card_invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON public.credit_card_invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON public.credit_card_invoices;

CREATE POLICY "Users can view invoices"
ON public.credit_card_invoices FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert invoices"
ON public.credit_card_invoices FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

CREATE POLICY "Users can update invoices"
ON public.credit_card_invoices FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

CREATE POLICY "Users can delete invoices"
ON public.credit_card_invoices FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

-- 18. Update RLS for credit_card_transactions
DROP POLICY IF EXISTS "Users can view own card transactions" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "Users can insert own card transactions" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "Users can update own card transactions" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "Users can delete own card transactions" ON public.credit_card_transactions;

CREATE POLICY "Users can view card transactions"
ON public.credit_card_transactions FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert card transactions"
ON public.credit_card_transactions FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

CREATE POLICY "Users can update card transactions"
ON public.credit_card_transactions FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

CREATE POLICY "Users can delete card transactions"
ON public.credit_card_transactions FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_cards'))
);

-- 19. Update RLS for reminders
DROP POLICY IF EXISTS "Users can view own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can insert own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update own reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete own reminders" ON public.reminders;

CREATE POLICY "Users can view reminders"
ON public.reminders FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert reminders"
ON public.reminders FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_reminders'))
);

CREATE POLICY "Users can update reminders"
ON public.reminders FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_reminders'))
);

CREATE POLICY "Users can delete reminders"
ON public.reminders FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_reminders'))
);

-- 20. Update RLS for categories
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;

CREATE POLICY "Users can view categories"
ON public.categories FOR SELECT
USING (
    is_default = true OR
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can insert categories"
ON public.categories FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_categories'))
);

CREATE POLICY "Users can update categories"
ON public.categories FOR UPDATE
USING (
    is_default = false AND (
        (auth.uid() = user_id AND group_id IS NULL) OR
        (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_categories'))
    )
);

CREATE POLICY "Users can delete categories"
ON public.categories FOR DELETE
USING (
    is_default = false AND (
        (auth.uid() = user_id AND group_id IS NULL) OR
        (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'manage_categories'))
    )
);

-- 21. Update RLS for monthly_reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.monthly_reports;

CREATE POLICY "Users can view reports"
ON public.monthly_reports FOR SELECT
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.has_group_permission(auth.uid(), group_id, 'view_reports'))
);

CREATE POLICY "Users can insert reports"
ON public.monthly_reports FOR INSERT
WITH CHECK (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update reports"
ON public.monthly_reports FOR UPDATE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete reports"
ON public.monthly_reports FOR DELETE
USING (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND public.is_group_admin(auth.uid(), group_id))
);

-- 22. Create updated_at triggers for new tables
CREATE TRIGGER update_financial_groups_updated_at
    BEFORE UPDATE ON public.financial_groups
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_members_updated_at
    BEFORE UPDATE ON public.group_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();