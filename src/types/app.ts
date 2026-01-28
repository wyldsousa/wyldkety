export interface MonthlyReport {
  id: string;
  user_id: string;
  month: number;
  year: number;
  total_income: number;
  total_expenses: number;
  balance: number;
  report_data: {
    transactions: number;
    byCategory: Record<string, { income: number; expense: number }>;
    dailyTotals: Record<string, { income: number; expense: number }>;
    accountBalances?: number;
    investedBalance?: number;
  } | null;
  generated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  icon: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  amount: number | null;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  xp: number;
  level: number;
  transactions_count: number;
  streak_days: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}
