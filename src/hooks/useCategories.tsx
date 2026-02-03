import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types/app';
import { useAuth } from './useAuth';
import { useActiveGroup } from '@/contexts/ActiveGroupContext';
import { toast } from 'sonner';
import { TRANSACTION_CATEGORIES } from '@/types/finance';
import { useEffect } from 'react';

export function useCategories() {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories', user?.id, activeGroupId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (activeGroupId) {
        // Group mode: get default categories + group categories
        query = query.or(`is_default.eq.true,group_id.eq.${activeGroupId}`);
      } else {
        // Personal mode: get default categories + user's personal categories
        query = query.or(`is_default.eq.true,and(user_id.eq.${user.id},group_id.is.null)`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Category[];
    },
    enabled: !!user,
  });

  // Real-time subscription for categories
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`categories_${activeGroupId || 'personal'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categories',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['categories', user.id, activeGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, queryClient]);

  const createCategory = useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'is_default'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('categories')
        .insert({ 
          ...category, 
          user_id: user.id,
          group_id: activeGroupId || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar categoria: ' + error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar categoria: ' + error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });

  // Combine custom categories with default ones
  const incomeCategories = [
    ...TRANSACTION_CATEGORIES.income,
    ...categories.filter(c => c.type === 'income').map(c => c.name)
  ];
  
  const expenseCategories = [
    ...TRANSACTION_CATEGORIES.expense,
    ...categories.filter(c => c.type === 'expense').map(c => c.name)
  ];

  return {
    categories,
    incomeCategories,
    expenseCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
