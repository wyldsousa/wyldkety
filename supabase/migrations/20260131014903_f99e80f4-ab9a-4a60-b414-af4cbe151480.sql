-- Create credit_cards table
CREATE TABLE public.credit_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  closing_day INTEGER NOT NULL DEFAULT 1,
  due_day INTEGER NOT NULL DEFAULT 10,
  interest_rate NUMERIC DEFAULT NULL,
  color TEXT DEFAULT '#8B5CF6',
  image_url TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create credit_card_invoices table
CREATE TABLE public.credit_card_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  minimum_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  paid_amount NUMERIC DEFAULT NULL,
  payment_account_id UUID DEFAULT NULL REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(card_id, month, year)
);

-- Create credit_card_transactions table
CREATE TABLE public.credit_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  card_id UUID NOT NULL REFERENCES public.credit_cards(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.credit_card_invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  installment_number INTEGER DEFAULT 1,
  total_installments INTEGER DEFAULT 1,
  parent_transaction_id UUID DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

-- Credit cards policies
CREATE POLICY "Users can view own cards"
ON public.credit_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards"
ON public.credit_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards"
ON public.credit_cards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards"
ON public.credit_cards FOR DELETE
USING (auth.uid() = user_id);

-- Credit card invoices policies
CREATE POLICY "Users can view own invoices"
ON public.credit_card_invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices"
ON public.credit_card_invoices FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices"
ON public.credit_card_invoices FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices"
ON public.credit_card_invoices FOR DELETE
USING (auth.uid() = user_id);

-- Credit card transactions policies
CREATE POLICY "Users can view own card transactions"
ON public.credit_card_transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card transactions"
ON public.credit_card_transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card transactions"
ON public.credit_card_transactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own card transactions"
ON public.credit_card_transactions FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_credit_cards_updated_at
BEFORE UPDATE ON public.credit_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_card_invoices_updated_at
BEFORE UPDATE ON public.credit_card_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credit_card_transactions_updated_at
BEFORE UPDATE ON public.credit_card_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();