import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
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
  auto_generate: boolean;
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('is_completed', { ascending: true })
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as any[]).map(r => ({
        ...r,
        auto_generate: r.auto_generate ?? true,
      })) as Reminder[];
    },
    enabled: !!user,
  });

  // Real-time subscription for reminders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('reminders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['reminders', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const createReminder = useMutation({
    mutationFn: async (reminder: Omit<Reminder, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at' | 'group_id' | 'created_by_user_id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('reminders')
        .insert({ 
          ...reminder, 
          user_id: user.id,
        } as any)
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
        .update(updates as any)
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
      const wasCompleted = reminder.is_completed;
      const willBeCompleted = !wasCompleted;
      
      // Update the current reminder
      const { data, error } = await supabase
        .from('reminders')
        .update({ 
          is_completed: willBeCompleted,
          completed_at: willBeCompleted ? new Date().toISOString() : null
        } as any)
        .eq('id', reminder.id)
        .select()
        .single();
      
      if (error) throw error;

      // ONLY auto-generate next reminder if:
      // 1. We are completing (not reopening)
      // 2. is_recurring is true
      // 3. auto_generate is true
      // 4. recurrence_type is not 'none'
      // 5. has a due_date
      if (
        willBeCompleted && 
        reminder.is_recurring && 
        reminder.auto_generate && 
        reminder.recurrence_type !== 'none' && 
        reminder.due_date
      ) {
        // Calculate next due date based on ORIGINAL due_date, not current date
        const dueDate = new Date(reminder.due_date);
        let nextDueDate: Date;

        switch (reminder.recurrence_type) {
          case 'weekly':
            nextDueDate = new Date(dueDate);
            nextDueDate.setDate(nextDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate = new Date(dueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            break;
          case 'yearly':
            nextDueDate = new Date(dueDate);
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            nextDueDate = dueDate;
        }

        // Create next recurring reminder with same properties
        await supabase
          .from('reminders')
          .insert({
            user_id: reminder.user_id,
            title: reminder.title,
            description: reminder.description,
            amount: reminder.amount,
            due_date: nextDueDate.toISOString().split('T')[0],
            is_completed: false,
            is_recurring: true,
            recurrence_type: reminder.recurrence_type,
            recurrence_day: reminder.recurrence_day,
            parent_reminder_id: reminder.parent_reminder_id || reminder.id,
            auto_generate: true,
          } as any);
      }

      return { data, reminder };
    },
    onSuccess: ({ data, reminder }) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      const isCompleted = (data as any).is_completed;
      if (isCompleted) {
        if (reminder.is_recurring && reminder.auto_generate && reminder.recurrence_type !== 'none') {
          toast.success('Lembrete concluído! Próximo lembrete criado automaticamente.');
        } else {
          toast.success('Lembrete concluído!');
        }
      } else {
        toast.success('Lembrete reaberto!');
      }
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
