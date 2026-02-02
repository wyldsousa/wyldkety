export interface BankAccount {
  id: string;
  user_id: string;
  group_id?: string | null;
  created_by_user_id?: string | null;
  name: string;
  bank_name: string;
  account_type: 'checking' | 'savings' | 'investment';
  balance: number;
  color: string;
  icon: string;
  is_investment: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  group_id?: string | null;
  created_by_user_id?: string | null;
  account_id: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  description: string | null;
  amount: number;
  date: string;
  transfer_to_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  email_verification_token: string | null;
  phone_verification_code: string | null;
  email_verification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TRANSACTION_CATEGORIES = {
  income: [
    'Salário',
    'Freelance',
    'Investimentos',
    'Vendas',
    'Outros'
  ],
  expense: [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Compras',
    'Contas',
    'Outros'
  ],
  transfer: ['Transferência']
};

export const BANK_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];
