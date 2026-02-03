-- =====================================================
-- ATUALIZAÇÃO RLS: Todos membros têm acesso completo
-- Apenas gestão de usuários fica restrita ao admin
-- =====================================================

-- =============== BANK_ACCOUNTS ===============
DROP POLICY IF EXISTS "Users can insert accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can update accounts" ON public.bank_accounts;
DROP POLICY IF EXISTS "Users can delete accounts" ON public.bank_accounts;

CREATE POLICY "Users can insert accounts" ON public.bank_accounts
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update accounts" ON public.bank_accounts
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete accounts" ON public.bank_accounts
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

-- =============== TRANSACTIONS ===============
DROP POLICY IF EXISTS "Users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete transactions" ON public.transactions;

CREATE POLICY "Users can insert transactions" ON public.transactions
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update transactions" ON public.transactions
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete transactions" ON public.transactions
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

-- =============== CATEGORIES ===============
DROP POLICY IF EXISTS "Users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete categories" ON public.categories;

CREATE POLICY "Users can insert categories" ON public.categories
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update categories" ON public.categories
FOR UPDATE USING (
  (is_default = false) AND (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
  )
);

CREATE POLICY "Users can delete categories" ON public.categories
FOR DELETE USING (
  (is_default = false) AND (
    (auth.uid() = user_id AND group_id IS NULL) OR
    (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
  )
);

-- =============== REMINDERS ===============
DROP POLICY IF EXISTS "Users can insert reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can update reminders" ON public.reminders;
DROP POLICY IF EXISTS "Users can delete reminders" ON public.reminders;

CREATE POLICY "Users can insert reminders" ON public.reminders
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update reminders" ON public.reminders
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete reminders" ON public.reminders
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

-- =============== CREDIT_CARDS ===============
DROP POLICY IF EXISTS "Users can insert cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can update cards" ON public.credit_cards;
DROP POLICY IF EXISTS "Users can delete cards" ON public.credit_cards;

CREATE POLICY "Users can insert cards" ON public.credit_cards
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update cards" ON public.credit_cards
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete cards" ON public.credit_cards
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

-- =============== CREDIT_CARD_INVOICES ===============
DROP POLICY IF EXISTS "Users can insert invoices" ON public.credit_card_invoices;
DROP POLICY IF EXISTS "Users can update invoices" ON public.credit_card_invoices;
DROP POLICY IF EXISTS "Users can delete invoices" ON public.credit_card_invoices;

CREATE POLICY "Users can insert invoices" ON public.credit_card_invoices
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update invoices" ON public.credit_card_invoices
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete invoices" ON public.credit_card_invoices
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

-- =============== CREDIT_CARD_TRANSACTIONS ===============
DROP POLICY IF EXISTS "Users can insert card transactions" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "Users can update card transactions" ON public.credit_card_transactions;
DROP POLICY IF EXISTS "Users can delete card transactions" ON public.credit_card_transactions;

CREATE POLICY "Users can insert card transactions" ON public.credit_card_transactions
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update card transactions" ON public.credit_card_transactions
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete card transactions" ON public.credit_card_transactions
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

-- =============== MONTHLY_REPORTS ===============
DROP POLICY IF EXISTS "Users can insert reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can update reports" ON public.monthly_reports;
DROP POLICY IF EXISTS "Users can delete reports" ON public.monthly_reports;

CREATE POLICY "Users can insert reports" ON public.monthly_reports
FOR INSERT WITH CHECK (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can update reports" ON public.monthly_reports
FOR UPDATE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);

CREATE POLICY "Users can delete reports" ON public.monthly_reports
FOR DELETE USING (
  (auth.uid() = user_id AND group_id IS NULL) OR
  (group_id IS NOT NULL AND is_group_member(auth.uid(), group_id))
);