import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { VirtualWallet, AdHistory, WithdrawalRequest } from '@/types/wallet';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useVirtualWallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['virtual_wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Try to get existing wallet
      let { data, error } = await supabase
        .from('virtual_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Create wallet if doesn't exist
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from('virtual_wallet')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (createError) throw createError;
        data = newWallet;
      }
      
      return data as VirtualWallet;
    },
    enabled: !!user,
  });

  const { data: adHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['ad_history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ad_history')
        .select('*')
        .eq('user_id', user.id)
        .order('watched_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AdHistory[];
    },
    enabled: !!user,
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery({
    queryKey: ['withdrawal_requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as WithdrawalRequest[];
    },
    enabled: !!user,
  });

  const recordAdWatch = useMutation({
    mutationFn: async ({ adType, rewardAmount }: { adType: string; rewardAmount: number }) => {
      if (!user || !wallet) throw new Error('Not authenticated');
      
      // Record ad watch
      const { error: adError } = await supabase
        .from('ad_history')
        .insert({
          user_id: user.id,
          ad_type: adType,
          reward_amount: rewardAmount,
        });
      
      if (adError) throw adError;
      
      // Update wallet balance
      const { error: walletError } = await supabase
        .from('virtual_wallet')
        .update({
          balance: wallet.balance + rewardAmount,
          total_earned: wallet.total_earned + rewardAmount,
        })
        .eq('user_id', user.id);
      
      if (walletError) throw walletError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual_wallet'] });
      queryClient.invalidateQueries({ queryKey: ['ad_history'] });
      toast.success('Recompensa adicionada à carteira!');
    },
    onError: (error) => {
      toast.error('Erro ao processar recompensa: ' + error.message);
    },
  });

  const requestWithdrawal = useMutation({
    mutationFn: async ({ amount, pixKey, pixType }: { amount: number; pixKey: string; pixType: string }) => {
      if (!user || !wallet) throw new Error('Not authenticated');
      
      if (amount > wallet.balance) {
        throw new Error('Saldo insuficiente');
      }

      if (amount < 10) {
        throw new Error('Valor mínimo para saque é R$ 10,00');
      }
      
      // Create withdrawal request
      const { error: withdrawError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount,
          pix_key: pixKey,
          pix_type: pixType,
        });
      
      if (withdrawError) throw withdrawError;
      
      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('virtual_wallet')
        .update({
          balance: wallet.balance - amount,
          total_withdrawn: wallet.total_withdrawn + amount,
        })
        .eq('user_id', user.id);
      
      if (walletError) throw walletError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['virtual_wallet'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawal_requests'] });
      toast.success('Solicitação de saque enviada! Aguarde processamento.');
    },
    onError: (error) => {
      toast.error('Erro ao solicitar saque: ' + error.message);
    },
  });

  return {
    wallet,
    adHistory,
    withdrawals,
    isLoading: walletLoading || historyLoading || withdrawalsLoading,
    recordAdWatch,
    requestWithdrawal,
  };
}
