import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useBankAccounts } from './useBankAccounts';
import { useTransactions } from './useTransactions';

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

// XP needed per level (increases each level)
const XP_PER_LEVEL = 100;

// XP rewards
export const XP_REWARDS = {
  TRANSACTION: 10,
  DAILY_LOGIN: 5,
  COMPLETE_REMINDER: 15,
  FIRST_ACCOUNT: 50,
  POSITIVE_BALANCE: 25,
};

export function useUserProgress() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { totalBalance, totalInvestments } = useBankAccounts();
  const { totalIncome, totalExpenses } = useTransactions();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['user_progress', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Try to get existing progress
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      // Create progress if it doesn't exist
      if (!data) {
        const { data: newProgress, error: createError } = await supabase
          .from('user_progress')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (createError) throw createError;
        return newProgress as UserProgress;
      }
      
      return data as UserProgress;
    },
    enabled: !!user,
  });

  const addXP = useMutation({
    mutationFn: async (xpAmount: number) => {
      if (!user || !progress) throw new Error('Not authenticated');
      
      const newXP = progress.xp + xpAmount;
      const xpForNextLevel = progress.level * XP_PER_LEVEL;
      let newLevel = progress.level;
      let remainingXP = newXP;
      
      // Check for level up
      while (remainingXP >= newLevel * XP_PER_LEVEL) {
        remainingXP -= newLevel * XP_PER_LEVEL;
        newLevel++;
      }
      
      const { data, error } = await supabase
        .from('user_progress')
        .update({ 
          xp: remainingXP,
          level: newLevel,
          last_activity_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', progress.id)
        .select()
        .single();
      
      if (error) throw error;
      return { data, leveledUp: newLevel > progress.level };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['user_progress'] });
      if (result.leveledUp) {
        // Could show a celebration toast here
      }
    },
  });

  const incrementTransactionCount = useMutation({
    mutationFn: async () => {
      if (!user || !progress) throw new Error('Not authenticated');
      
      const newXP = progress.xp + XP_REWARDS.TRANSACTION;
      const xpForNextLevel = progress.level * XP_PER_LEVEL;
      let newLevel = progress.level;
      let remainingXP = newXP;
      
      while (remainingXP >= newLevel * XP_PER_LEVEL) {
        remainingXP -= newLevel * XP_PER_LEVEL;
        newLevel++;
      }
      
      const { data, error } = await supabase
        .from('user_progress')
        .update({ 
          xp: remainingXP,
          level: newLevel,
          transactions_count: progress.transactions_count + 1,
          last_activity_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', progress.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_progress'] });
    },
  });

  // Calculate mood based on financial health
  const getMood = () => {
    const balance = totalBalance;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const hasInvestments = totalInvestments > 0;
    
    // Excellent: Positive balance, saving > 30%, has investments
    if (balance > 0 && savingsRate >= 30 && hasInvestments) {
      return { emoji: '🤩', label: 'Excelente!', color: 'text-green-500' };
    }
    // Great: Positive balance, saving > 20%
    if (balance > 0 && savingsRate >= 20) {
      return { emoji: '😄', label: 'Muito bem!', color: 'text-green-400' };
    }
    // Good: Positive balance, saving > 10%
    if (balance > 0 && savingsRate >= 10) {
      return { emoji: '😊', label: 'Indo bem!', color: 'text-lime-500' };
    }
    // Okay: Positive balance but low savings
    if (balance > 0 && savingsRate > 0) {
      return { emoji: '🙂', label: 'Pode melhorar', color: 'text-yellow-500' };
    }
    // Neutral: Breaking even
    if (balance === 0 || savingsRate === 0) {
      return { emoji: '😐', label: 'Atenção!', color: 'text-orange-400' };
    }
    // Concerned: Negative savings or balance
    if (balance < 0 || savingsRate < 0) {
      return { emoji: '😟', label: 'Cuidado!', color: 'text-orange-500' };
    }
    // Worried: Significant negative
    if (balance < -1000 || savingsRate < -20) {
      return { emoji: '😰', label: 'Atenção urgente!', color: 'text-red-500' };
    }
    
    return { emoji: '🙂', label: 'Continue assim!', color: 'text-yellow-500' };
  };

  const getXPProgress = () => {
    if (!progress) return { current: 0, needed: XP_PER_LEVEL, percentage: 0 };
    const needed = progress.level * XP_PER_LEVEL;
    return {
      current: progress.xp,
      needed,
      percentage: (progress.xp / needed) * 100,
    };
  };

  const getLevelTitle = () => {
    if (!progress) return 'Iniciante';
    const level = progress.level;
    if (level >= 50) return 'Mestre Financeiro';
    if (level >= 40) return 'Expert';
    if (level >= 30) return 'Investidor';
    if (level >= 20) return 'Economista';
    if (level >= 15) return 'Poupador';
    if (level >= 10) return 'Planejador';
    if (level >= 5) return 'Organizador';
    if (level >= 3) return 'Aprendiz';
    return 'Iniciante';
  };

  return {
    progress,
    isLoading,
    addXP,
    incrementTransactionCount,
    getMood,
    getXPProgress,
    getLevelTitle,
  };
}
