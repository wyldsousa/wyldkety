import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  type: 'system' | 'update' | 'reminder';
  title: string;
  message: string;
  amount?: number | null;
  dueDate?: string | null;
  createdAt: string;
  read: boolean;
}

// System notifications (static for now, can be fetched from backend later)
const systemNotifications: Notification[] = [
  {
    id: 'welcome-1',
    type: 'update',
    title: 'Bem-vindo ao FinanceApp!',
    message: 'Gerencie suas finanças de forma simples e inteligente. Explore todas as funcionalidades disponíveis.',
    createdAt: new Date().toISOString(),
    read: false,
  },
  {
    id: 'update-ai',
    type: 'update',
    title: 'Assistente IA disponível',
    message: 'Use nosso assistente inteligente para adicionar transações rapidamente usando linguagem natural.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    read: false,
  },
];

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pushEnabled, setPushEnabled] = useState(false);

  // Load notifications and push settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem('app_notifications');
    const savedPushEnabled = localStorage.getItem('push_notifications_enabled');
    
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    } else {
      setNotifications(systemNotifications);
      localStorage.setItem('app_notifications', JSON.stringify(systemNotifications));
    }

    if (savedPushEnabled) {
      setPushEnabled(JSON.parse(savedPushEnabled));
    }
  }, []);

  // Request push notification permission
  const requestPushPermission = useCallback(async () => {
    try {
      // Check if running in Capacitor
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('Notificações ativadas!');
          return true;
        } else {
          toast.error('Permissão de notificações negada');
          return false;
        }
      } else {
        // For Capacitor, we'd use @capacitor/push-notifications
        toast.info('Notificações push serão configuradas no app mobile');
        return true;
      }
    } catch (error) {
      console.error('Error requesting push permission:', error);
      toast.error('Erro ao configurar notificações');
      return false;
    }
  }, []);

  // Toggle push notifications
  const togglePushNotifications = useCallback(async () => {
    if (!pushEnabled) {
      const granted = await requestPushPermission();
      if (granted) {
        setPushEnabled(true);
        localStorage.setItem('push_notifications_enabled', 'true');
      }
    } else {
      setPushEnabled(false);
      localStorage.setItem('push_notifications_enabled', 'false');
      toast.info('Notificações desativadas');
    }
  }, [pushEnabled, requestPushPermission]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      localStorage.setItem('app_notifications', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('app_notifications', JSON.stringify(updated));
      return updated;
    });
    toast.success('Todas as notificações marcadas como lidas');
  }, []);

  // Add new notification
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      localStorage.setItem('app_notifications', JSON.stringify(updated));
      return updated;
    });

    // Show push notification if enabled
    if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
      });
    }
  }, [pushEnabled]);

  // Schedule reminder notification
  const scheduleReminderNotification = useCallback((reminder: {
    id: string;
    title: string;
    dueDate: string;
    amount?: number | null;
  }) => {
    if (!pushEnabled) return;

    const dueDate = new Date(reminder.dueDate);
    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    
    // Schedule notification for due date
    if (timeDiff > 0) {
      setTimeout(() => {
        addNotification({
          type: 'reminder',
          title: `Lembrete: ${reminder.title}`,
          message: `Vencimento hoje${reminder.amount ? ` - ${reminder.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}`,
          amount: reminder.amount,
          dueDate: reminder.dueDate,
        });
      }, timeDiff);
    }
  }, [pushEnabled, addNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    pushEnabled,
    togglePushNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    scheduleReminderNotification,
    unreadCount,
  };
}
