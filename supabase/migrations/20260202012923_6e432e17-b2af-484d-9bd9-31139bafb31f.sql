-- Add image_url to bank_accounts
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS image_url text;

-- Add recurrence fields to reminders
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS recurrence_type text DEFAULT 'none' CHECK (recurrence_type IN ('none', 'weekly', 'monthly', 'yearly'));
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS recurrence_day integer;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS parent_reminder_id uuid REFERENCES public.reminders(id) ON DELETE SET NULL;