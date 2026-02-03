import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, CreditCardInvoice, CreditCardTransaction } from '@/types/creditCard';
import { useAuth } from './useAuth';
import { useActiveGroup } from '@/contexts/ActiveGroupContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useCreditCards() {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['credit_cards', user?.id, activeGroupId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (activeGroupId) {
        query = query.eq('group_id', activeGroupId);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCard[];
    },
    enabled: !!user,
  });

  // Real-time subscription for credit cards
  useEffect(() => {
    if (!user) return;

    const filter = activeGroupId 
      ? `group_id=eq.${activeGroupId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`credit_cards_${activeGroupId || 'personal'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_cards',
          filter,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['credit_cards', user.id, activeGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, queryClient]);

  const createCard = useMutation({
    mutationFn: async (card: Omit<CreditCard, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('credit_cards')
        .insert({ 
          ...card, 
          user_id: user.id,
          group_id: activeGroupId || null,
          created_by_user_id: user.id,
        })
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

  const totalLimit = cards.reduce((sum, c) => sum + Number(c.credit_limit), 0);

  return {
    cards,
    isLoading,
    totalLimit,
    createCard,
    updateCard,
    deleteCard,
  };
}

export function useCreditCardInvoices(cardId?: string) {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['credit_card_invoices', user?.id, activeGroupId, cardId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('credit_card_invoices')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (activeGroupId) {
        query = query.eq('group_id', activeGroupId);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }
      
      if (cardId) {
        query = query.eq('card_id', cardId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardInvoice[];
    },
    enabled: !!user,
  });

  // Real-time subscription for invoices
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`credit_card_invoices_${activeGroupId || 'personal'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_invoices',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['credit_card_invoices', user.id, activeGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, queryClient]);

  const getOrCreateInvoice = useMutation({
    mutationFn: async ({ cardId, month, year }: { cardId: string; month: number; year: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data: existing } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('card_id', cardId)
        .eq('month', month)
        .eq('year', year)
        .single();
      
      if (existing) return existing;
      
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .insert({
          user_id: user.id,
          card_id: cardId,
          month,
          year,
          total_amount: 0,
          minimum_amount: 0,
          status: 'open',
          group_id: activeGroupId || null,
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
      
      // Update invoice status to paid
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
          date: new Date().toISOString().split('T')[0],
          group_id: activeGroupId || null,
          created_by_user_id: user.id,
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

  const partialPayInvoice = useMutation({
    mutationFn: async ({ invoiceId, accountId, amount }: { invoiceId: string; accountId: string; amount: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get current invoice
      const { data: invoice } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();
      
      if (!invoice) throw new Error('Fatura não encontrada');
      
      const currentPaid = Number(invoice.paid_amount) || 0;
      const newPaid = currentPaid + amount;
      const total = Number(invoice.total_amount);
      
      // Determine new status
      const newStatus = newPaid >= total ? 'paid' : 'partial';
      
      // Update invoice
      await supabase
        .from('credit_card_invoices')
        .update({
          status: newStatus,
          paid_amount: newPaid,
          paid_at: newStatus === 'paid' ? new Date().toISOString() : invoice.paid_at,
          payment_account_id: accountId
        })
        .eq('id', invoiceId);
      
      // Create transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          type: 'expense',
          category: 'Cartão de Crédito',
          description: `Pagamento parcial de fatura`,
          amount,
          date: new Date().toISOString().split('T')[0],
          group_id: activeGroupId || null,
          created_by_user_id: user.id,
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
      toast.success('Pagamento parcial registrado!');
    },
    onError: (error) => {
      toast.error('Erro ao pagar fatura: ' + error.message);
    },
  });

  const openInvoices = invoices.filter(i => i.status === 'open');
  const closedInvoices = invoices.filter(i => i.status === 'closed');
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const partialInvoices = invoices.filter(i => i.status === 'partial');

  return {
    invoices,
    openInvoices,
    closedInvoices,
    paidInvoices,
    overdueInvoices,
    partialInvoices,
    isLoading,
    getOrCreateInvoice,
    updateInvoice,
    payInvoice,
    partialPayInvoice,
  };
}

export function useCreditCardTransactions(invoiceId?: string) {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['credit_card_transactions', user?.id, activeGroupId, invoiceId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('credit_card_transactions')
        .select('*')
        .order('date', { ascending: false });
      
      if (activeGroupId) {
        query = query.eq('group_id', activeGroupId);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }
      
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CreditCardTransaction[];
    },
    enabled: !!user,
  });

  // Real-time subscription for card transactions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`credit_card_transactions_${activeGroupId || 'personal'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credit_card_transactions',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['credit_card_transactions', user.id, activeGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, queryClient]);

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<CreditCardTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .insert({ 
          ...transaction, 
          user_id: user.id,
          group_id: activeGroupId || null,
          created_by_user_id: user.id,
        })
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

  const prepayInstallments = useMutation({
    mutationFn: async ({ 
      transaction, 
      accountId, 
      installmentsToPay 
    }: { 
      transaction: CreditCardTransaction; 
      accountId: string; 
      installmentsToPay: number 
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const amountToPay = installmentsToPay * Number(transaction.amount);
      
      // Find and delete future installment transactions
      const { data: futureTransactions } = await supabase
        .from('credit_card_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('card_id', transaction.card_id)
        .eq('parent_transaction_id', transaction.parent_transaction_id || transaction.id)
        .gt('installment_number', transaction.installment_number)
        .order('installment_number', { ascending: true })
        .limit(installmentsToPay);
      
      if (futureTransactions && futureTransactions.length > 0) {
        // Delete the prepaid installments
        for (const ft of futureTransactions) {
          // Update invoice total
          const { data: invoice } = await supabase
            .from('credit_card_invoices')
            .select('total_amount')
            .eq('id', ft.invoice_id)
            .single();
          
          if (invoice) {
            await supabase
              .from('credit_card_invoices')
              .update({ total_amount: Math.max(0, Number(invoice.total_amount) - Number(ft.amount)) })
              .eq('id', ft.invoice_id);
          }
          
          await supabase
            .from('credit_card_transactions')
            .delete()
            .eq('id', ft.id);
        }
      }
      
      // Create payment transaction in bank account
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          type: 'expense',
          category: 'Cartão de Crédito',
          description: `Antecipação de ${installmentsToPay} parcela(s) - ${transaction.description}`,
          amount: amountToPay,
          date: new Date().toISOString().split('T')[0],
          group_id: activeGroupId || null,
          created_by_user_id: user.id,
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
          .update({ balance: Number(account.balance) - amountToPay })
          .eq('id', accountId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit_card_transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Parcelas antecipadas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao antecipar parcelas: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async ({ id, invoiceId, amount }: { id: string; invoiceId: string; amount: number }) => {
      const { error } = await supabase
        .from('credit_card_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
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
    prepayInstallments,
    deleteTransaction,
  };
}
