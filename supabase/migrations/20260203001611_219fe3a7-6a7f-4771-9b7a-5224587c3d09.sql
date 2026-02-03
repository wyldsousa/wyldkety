-- Enable realtime for all financial tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_card_invoices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credit_card_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.financial_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;