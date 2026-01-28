import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MonthlyReport } from '@/types/app';
import { Transaction } from '@/types/finance';
import { useAuth } from './useAuth';
import { useBankAccounts } from './useBankAccounts';
import { toast } from 'sonner';

export function useReports() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { totalBalance, totalInvestments } = useBankAccounts();

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['monthly_reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });
      
      if (error) throw error;
      return data as MonthlyReport[];
    },
    enabled: !!user,
  });

  const generateReport = useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Get transactions for the month
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);
      
      if (txError) throw txError;
      
      const typedTransactions = transactions as Transaction[];
      
      // Calculate totals
      const totalIncome = typedTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      const totalExpenses = typedTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      
      // Group by category
      const byCategory = typedTransactions.reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
          acc[t.category].income += Number(t.amount);
        } else if (t.type === 'expense') {
          acc[t.category].expense += Number(t.amount);
        }
        return acc;
      }, {} as Record<string, { income: number; expense: number }>);
      
      const reportData = {
        transactions: typedTransactions.length,
        byCategory,
        dailyTotals: typedTransactions.reduce((acc, t) => {
          if (!acc[t.date]) {
            acc[t.date] = { income: 0, expense: 0 };
          }
          if (t.type === 'income') {
            acc[t.date].income += Number(t.amount);
          } else if (t.type === 'expense') {
            acc[t.date].expense += Number(t.amount);
          }
          return acc;
        }, {} as Record<string, { income: number; expense: number }>),
        accountBalances: totalBalance,
        investedBalance: totalInvestments,
      };
      
      // Upsert report
      const { data, error } = await supabase
        .from('monthly_reports')
        .upsert({
          user_id: user.id,
          month,
          year,
          total_income: totalIncome,
          total_expenses: totalExpenses,
          balance: totalIncome - totalExpenses,
          report_data: reportData,
        }, {
          onConflict: 'user_id,month,year'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
      toast.success('Relatório gerado!');
    },
    onError: (error) => {
      toast.error('Erro ao gerar relatório: ' + error.message);
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monthly_reports')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly_reports'] });
      toast.success('Relatório excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir relatório: ' + error.message);
    },
  });

  return {
    reports,
    isLoading,
    generateReport,
    deleteReport,
  };
}
