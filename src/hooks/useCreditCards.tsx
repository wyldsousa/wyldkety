import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, CreditCardInvoice, CreditCardTransaction } from '@/types/creditCard';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useCreditCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit_cards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });

  const createCard = useMutation({
    mutationFn: async (card: Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ ...card, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cartão: ' + error.message);
    },
  });

  const updateCard = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCard> & { id: string }) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar cartão: ' + error.message);
    },
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('credit_cards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      toast.success('Cartão excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir cartão: ' + error.message);
    },
  });

  // Calculate used limit and available limit for each card
  const cardsWithLimits = cards.map(card => {
    // This will be calculated based on open invoices
    return {
      ...card,
      used_limit: 0, // Will be calculated from invoices
      available_limit: card.credit_limit
    };
  });

  const totalLimit = cards.reduce((sum, c) => sum + Number(c.credit_limit), 0);

  return {
    cards: cardsWithLimits,
    isLoading,
    totalLimit,
    createCard,
    updateCard,
    deleteCard,
  };
}

export function useCreditCardInvoices(cardId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['credit_card_invoices', user?.id, cardId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (cardId) {
        query = query.eq('card_id', cardId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardInvoice[];
    },
    enabled: !!user,
  });

  const getOrCreateInvoice = useMutation({
    mutationFn: async ({ cardId, month, year }: { cardId: string; month: number; year: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Try to find existing invoice
      const { data: existing } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('card_id', cardId)
        .eq('month', month)
        .eq('year', year)
        .single();
      
      if (existing) return existing;
      
      // Create new invoice
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .insert({
          user_id: user.id,
          card_id: cardId,
          month,
          year,
          total_amount: 0,
          minimum_amount: 0,
          status: 'open'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
    },
  });

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditCardInvoice> & { id: string }) => {
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
    },
  });

  const payInvoice = useMutation({
    mutationFn: async ({ invoiceId, accountId, amount }: { invoiceId: string; accountId: string; amount: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Update invoice status
      await supabase
        .from('credit_card_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_amount: amount,
          payment_account_id: accountId
        })
        .eq('id', invoiceId);
      
      // Create transaction in bank account
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          type: 'expense',
          category: 'Cartão de Crédito',
          description: 'Pagamento de fatura',
          amount,
          date: new Date().toISOString().split('T')[0]
        });
      
      // Update account balance
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', accountId)
        .single();
      
      if (account) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(account.balance) - amount })
          .eq('id', accountId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Fatura paga com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao pagar fatura: ' + error.message);
    },
  });

  // Separate invoices by status
  const openInvoices = invoices.filter(i => i.status === 'open');
  const closedInvoices = invoices.filter(i => i.status === 'closed');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');

  return {
    invoices,
    openInvoices,
    closedInvoices,
    paidInvoices,
    overdueInvoices,
    isLoading,
    getOrCreateInvoice,
    updateInvoice,
    payInvoice,
  };
}

export function useCreditCardTransactions(invoiceId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['credit_card_transactions', user?.id, invoiceId],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from('credit_card_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardTransaction[];
    },
    enabled: !!user,
  });

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<CreditCardTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .insert({ ...transaction, user_id: user.id })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update invoice total
      const { data: invoice } = await supabase
        .from('credit_card_invoices')
        .select('total_amount')
        .eq('id', transaction.invoice_id)
        .single();
      
      if (invoice) {
        await supabase
          .from('credit_card_invoices')
          .update({ total_amount: Number(invoice.total_amount) + Number(transaction.amount) })
          .eq('id', transaction.invoice_id);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
      toast.success('Compra registrada!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar compra: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async ({ id, invoiceId, amount }: { id: string; invoiceId: string; amount: number }) => {
      const { error } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Update invoice total
      const { data: invoice } = await supabase
        .from('credit_card_invoices')
        .select('total_amount')
        .eq('id', invoiceId)
        .single();
      
      if (invoice) {
        await supabase
          .from('credit_card_invoices')
          .update({ total_amount: Math.max(0, Number(invoice.total_amount) - Number(amount)) })
          .eq('id', invoiceId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
      toast.success('Compra excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir compra: ' + error.message);
    },
  });

  return {
    transactions,
    isLoading,
    createTransaction,
    deleteTransaction,
  };
}
