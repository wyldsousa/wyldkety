export interface VirtualWallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

export interface AdHistory {
  id: string;
  user_id: string;
  ad_type: string;
  reward_amount: number;
  watched_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string;
  pix_type: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
  balance: number;
  report_data: any;
  generated_at: string;
}
