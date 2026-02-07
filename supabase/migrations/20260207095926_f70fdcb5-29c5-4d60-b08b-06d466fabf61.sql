-- Add auto_generate column to reminders for controlling automatic recurrence
ALTER TABLE public.reminders 
ADD COLUMN IF NOT EXISTS auto_generate boolean NOT NULL DEFAULT true;