import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useActiveGroup } from '@/contexts/ActiveGroupContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  amount: number | null;
  due_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  is_recurring: boolean;
  recurrence_type: 'none' | 'weekly' | 'monthly' | 'yearly';
  recurrence_day: number | null;
  parent_reminder_id: string | null;
  group_id: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const { user } = useAuth();
  const { activeGroupId } = useActiveGroup();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', user?.id, activeGroupId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('reminders')
        .select('*')
        .order('is_completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (activeGroupId) {
        query = query.eq('group_id', activeGroupId);
      } else {
        query = query.eq('user_id', user.id).is('group_id', null);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Reminder[];
    },
    enabled: !!user,
  });

  // Real-time subscription for reminders
  useEffect(() => {
    if (!user) return;

    const filter = activeGroupId 
      ? `group_id=eq.${activeGroupId}`
      : `user_id=eq.${user.id}`;

    const channel = supabase
      .channel(`reminders_${activeGroupId || 'personal'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reminders', user.id, activeGroupId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeGroupId, queryClient]);

  const createReminder = useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'group_id' | 'created_by_user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('reminders')
        .insert({ 
          ...reminder, 
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
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar lembrete: ' + error.message);
    },
  });

  const updateReminder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Reminder> & { id: string }) => {
      const { data, error } = await supabase
        .from('reminders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lembrete: ' + error.message);
    },
  });

  const toggleReminder = useMutation({
    mutationFn: async (reminder: Reminder) => {
      const { data, error } = await supabase
        .from('reminders')
        .update({ 
          is_completed: !reminder.is_completed,
          completed_at: !reminder.is_completed ? new Date().toISOString() : null
        })
        .eq('id', reminder.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(data.is_completed ? 'Lembrete concluído!' : 'Lembrete reaberto!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lembrete: ' + error.message);
    },
  });

  const deleteReminder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Lembrete excluído!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir lembrete: ' + error.message);
    },
  });

  const pendingReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);

  return {
    reminders,
    pendingReminders,
    completedReminders,
    isLoading,
    createReminder,
    updateReminder,
    toggleReminder,
    deleteReminder,
  };
}
