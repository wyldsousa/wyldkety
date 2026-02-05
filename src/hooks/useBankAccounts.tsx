import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount } from '@/types/finance';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useBankAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['bank_accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      const { data, error } = await query;
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user,
  });

  // Real-time subscription for bank accounts
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bank_accounts_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_accounts',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bank_accounts', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createAccount = useMutation({
    mutationFn: async (account: Omit<BankAccount, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({ 
          ...account, 
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar conta: ' + error.message);
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BankAccount> & { id: string }) => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Conta atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar conta: ' + error.message);
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });
      toast.success('Conta excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir conta: ' + error.message);
    },
  });

  const regularAccounts = accounts.filter(a => !a.is_investment);
  const investmentAccounts = accounts.filter(a => a.is_investment);
  const totalBalance = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalInvestments = investmentAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return {
    accounts,
    regularAccounts,
    investmentAccounts,
    totalBalance,
    totalInvestments,
    isLoading,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
