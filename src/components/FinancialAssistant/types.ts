export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: TransactionAction;
  pendingTransaction?: PendingTransaction;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

export interface PendingTransaction {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  category?: string;
  description: string;
  account_id: string;
  account_name?: string;
  transfer_to_account_id?: string;
  transfer_to_account_name?: string;
  date: string;
  installments?: number;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
}

export type TransactionAction = 
  | 'create_transaction'
  | 'create_transfer'
  | 'query_finances'
  | 'general_response'
  | 'query_response'
  | 'edit_pending'
  | 'confirm'
  | 'cancel';

export interface FinancialInsight {
  type: 'warning' | 'tip' | 'achievement';
  message: string;
  icon: string;
}
