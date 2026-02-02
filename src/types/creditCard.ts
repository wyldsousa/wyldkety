export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  bank_name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  interest_rate: number | null;
  color: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardInvoice {
  id: string;
  user_id: string;
  card_id: string;
  month: number;
  year: number;
  total_amount: number;
  minimum_amount: number;
  status: 'open' | 'closed' | 'paid' | 'overdue' | 'partial';
  paid_at: string | null;
  paid_amount: number | null;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardTransaction {
  id: string;
  user_id: string;
  card_id: string;
  invoice_id: string;
  amount: number;
  description: string | null;
  category: string;
  date: string;
  installment_number: number;
  total_installments: number;
  parent_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export const CARD_COLORS = [
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#1F2937', // Dark Gray
];
