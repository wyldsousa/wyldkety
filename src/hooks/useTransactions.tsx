import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types/finance';
import { useAuth } from './useAuth';
import { useActiveGroup } from '@/contexts/ActiveGroupContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useTransactions(accountId?: string) {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, activeGroupId, accountId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (activeGroupId) {
        query = query.eq('group_id', activeGroupId);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }
      
      if (accountId) {
        query = query.eq('account_id', accountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!user,
  });

  // Real-time subscription for transactions
  useEffect(() => {
    if (!user) return;

    const filter = activeGroupId 
      ? `group_id=eq.${activeGroupId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`transactions_${activeGroupId || 'personal'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions', user.id, activeGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, queryClient]);

  const createTransaction = useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      
      // Create the transaction
      const { data, error } = await supabase
        .from('transactions')
        .insert({ 
          ...transaction, 
          user_id: user.id,
          group_id: activeGroupId || null,
          created_by_user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Update account balance
      const balanceChange = transaction.type === 'income' 
        ? Number(transaction.amount)
        : -Number(transaction.amount);
      
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', transaction.account_id)
        .single();
      
      if (account) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(account.balance) + balanceChange })
          .eq('id', transaction.account_id);
      }

      // If it's a transfer, update the destination account
      if (transaction.type === 'transfer' && transaction.transfer_to_account_id) {
        const { data: destAccount } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('id', transaction.transfer_to_account_id)
          .single();
        
        if (destAccount) {
          await supabase
            .from('bank_accounts')
            .update({ balance: Number(destAccount.balance) + Number(transaction.amount) })
            .eq('id', transaction.transfer_to_account_id);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Transação registrada!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar transação: ' + error.message);
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, oldTransaction, ...updates }: Partial<Transaction> & { id: string; oldTransaction: Transaction }) => {
      // Revert old balance change
      const oldBalanceChange = oldTransaction.type === 'income' 
        ? -Number(oldTransaction.amount)
        : Number(oldTransaction.amount);
      
      const { data: oldAccount } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', oldTransaction.account_id)
        .single();
      
      if (oldAccount) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(oldAccount.balance) + oldBalanceChange })
          .eq('id', oldTransaction.account_id);
      }

      // Apply new balance change
      const newType = updates.type || oldTransaction.type;
      const newAmount = updates.amount || oldTransaction.amount;
      const newAccountId = updates.account_id || oldTransaction.account_id;
      const newBalanceChange = newType === 'income' 
        ? Number(newAmount)
        : -Number(newAmount);
      
      const { data: newAccount } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', newAccountId)
        .single();
      
      if (newAccount) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(newAccount.balance) + newBalanceChange })
          .eq('id', newAccountId);
      }

      // Update transaction
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Transação atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar transação: ' + error.message);
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (transaction: Transaction) => {
      // Revert balance change
      const balanceChange = transaction.type === 'income' 
        ? -Number(transaction.amount)
        : Number(transaction.amount);
      
      const { data: account } = await supabase
        .from('bank_accounts')
        .select('balance')
        .eq('id', transaction.account_id)
        .single();
      
      if (account) {
        await supabase
          .from('bank_accounts')
          .update({ balance: Number(account.balance) + balanceChange })
          .eq('id', transaction.account_id);
      }

      // If it was a transfer, revert destination account
      if (transaction.type === 'transfer' && transaction.transfer_to_account_id) {
        const { data: destAccount } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('id', transaction.transfer_to_account_id)
          .single();
        
        if (destAccount) {
          await supabase
            .from('bank_accounts')
            .update({ balance: Number(destAccount.balance) - Number(transaction.amount) })
            .eq('id', transaction.transfer_to_account_id);
        }
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transaction.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Transação excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir transação: ' + error.message);
    },
  });

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    transactions,
    isLoading,
    totalIncome,
    totalExpenses,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
