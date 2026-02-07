import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, DollarSign, AlertCircle, CheckCircle2, Clock, Megaphone, BellOff, Trash2, Check, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useReminders } from '@/hooks/useReminders';
import { useNotifications } from '@/hooks/useNotifications';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { reminders, toggleReminder, updateReminder } = useReminders();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead,
    unreadCount: systemUnreadCount 
  } = useNotifications();

  // Touch/swipe state
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  // Read notification preferences
  const notifPrefs = useMemo(() => {
    const saved = localStorage.getItem('notification_preferences');
    return saved ? JSON.parse(saved) : { reminders: true, recurring: true, assistant: true };
  }, [open]); // re-read when popover opens

  // Convert reminders to notifications format (respecting preferences)
  const reminderNotifications = useMemo(() => {
    if (!notifPrefs.reminders) return [];

    const now = new Date();
    return reminders
      .filter(r => {
        if (r.is_completed) return false;
        // Filter recurring reminders based on preference
        if (r.is_recurring && !notifPrefs.recurring) return false;
        return true;
      })
      .map(reminder => {
        const dueDate = reminder.due_date ? new Date(reminder.due_date) : null;
        const isOverdue = dueDate && dueDate < now;
        const isDueSoon = dueDate && !isOverdue && 
          (dueDate.getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000;

        let priority: 'high' | 'medium' | 'low' = 'low';
        if (isOverdue) priority = 'high';
        else if (isDueSoon) priority = 'medium';

        return {
          id: `reminder-${reminder.id}`,
          reminderId: reminder.id,
          type: 'reminder' as const,
          title: reminder.title,
          message: reminder.description || (isOverdue ? 'Lembrete vencido!' : 'Lembrete financeiro'),
          amount: reminder.amount,
          dueDate: reminder.due_date,
          isOverdue,
          isDueSoon,
          priority,
          createdAt: reminder.created_at,
          read: false,
          reminderData: reminder,
        };
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [reminders, notifPrefs]);

  // Combine all notifications
  const allNotifications = useMemo(() => {
    const combined = [
      ...reminderNotifications,
      ...notifications
        .filter(n => !n.read)
        .map(n => ({
          ...n,
          priority: 'low' as const,
          isOverdue: false,
          isDueSoon: false,
          reminderId: undefined,
          reminderData: undefined,
        }))
    ].slice(0, 15);
    return combined;
  }, [reminderNotifications, notifications]);

  const totalUnread = reminderNotifications.length + systemUnreadCount;

  const getNotificationIcon = (notification: typeof allNotifications[0]) => {
    if (notification.type === 'reminder') {
      if (notification.isOverdue) return <AlertCircle className="w-4 h-4 text-destructive" />;
      if (notification.isDueSoon) return <Clock className="w-4 h-4 text-yellow-500" />;
      return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
    if (notification.type === 'update') return <Megaphone className="w-4 h-4 text-primary" />;
    return <Bell className="w-4 h-4 text-muted-foreground" />;
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    toast.success('Todas as notificações marcadas como lidas');
  };

  // Handle completing a reminder directly from notification
  const handleCompleteReminder = useCallback((notification: typeof allNotifications[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.reminderData) {
      toggleReminder.mutate(notification.reminderData);
    }
  }, [toggleReminder]);

  // Handle postponing a reminder
  const handlePostponeReminder = useCallback(async (notification: typeof allNotifications[0], days: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.reminderData && notification.dueDate) {
      const currentDate = new Date(notification.dueDate);
      currentDate.setDate(currentDate.getDate() + days);
      
      await updateReminder.mutateAsync({
        id: notification.reminderData.id,
        due_date: currentDate.toISOString().split('T')[0],
      });
      toast.success(`Lembrete adiado para ${formatDate(currentDate.toISOString().split('T')[0])}`);
    }
  }, [updateReminder]);

  // Handle deleting a notification
  const handleDeleteNotification = useCallback((notification: typeof allNotifications[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.type === 'reminder') {
      // For reminders, mark as read removes from list
      toast.info('Use a aba Lembretes para excluir lembretes');
    } else {
      markAsRead(notification.id);
      toast.success('Notificação removida');
    }
  }, [markAsRead]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent, notificationId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    setSwipingId(notificationId);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingId) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = (notification: typeof allNotifications[0]) => {
    if (!swipingId) return;
    
    const SWIPE_THRESHOLD = 80;
    
    if (swipeOffset > SWIPE_THRESHOLD) {
      // Swipe right - mark as read/complete
      if (notification.type === 'reminder' && notification.reminderData) {
        toggleReminder.mutate(notification.reminderData);
      } else {
        markAsRead(notification.id);
      }
    } else if (swipeOffset < -SWIPE_THRESHOLD) {
      // Swipe left - delete/dismiss
      if (notification.type !== 'reminder') {
        markAsRead(notification.id);
        toast.success('Notificação removida');
      }
    }
    
    setSwipingId(null);
    setSwipeOffset(0);
  };

  const handleNotificationClick = (notification: typeof allNotifications[0]) => {
    if (notification.type === 'reminder') {
      setOpen(false);
      navigate('/reminders');
    } else {
      markAsRead(notification.id);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1 animate-pulse">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {totalUnread > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 px-2"
              onClick={handleMarkAllRead}
            >
              <Check className="w-3 h-3 mr-1" />
              Marcar lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[350px]">
          {allNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <BellOff className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {allNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="relative overflow-hidden"
                  onTouchStart={(e) => handleTouchStart(e, notification.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(notification)}
                >
                  {/* Swipe background indicators */}
                  <div className="absolute inset-0 flex">
                    <div className={cn(
                      "flex-1 bg-green-500/20 flex items-center justify-start pl-4 transition-opacity",
                      swipingId === notification.id && swipeOffset > 30 ? "opacity-100" : "opacity-0"
                    )}>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className={cn(
                      "flex-1 bg-destructive/20 flex items-center justify-end pr-4 transition-opacity",
                      swipingId === notification.id && swipeOffset < -30 ? "opacity-100" : "opacity-0"
                    )}>
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                  </div>
                  
                  {/* Notification content */}
                  <div
                    className={cn(
                      'p-3 bg-background transition-all cursor-pointer',
                      notification.isOverdue && 'bg-destructive/5',
                      notification.priority === 'high' && 'border-l-2 border-l-destructive',
                      notification.priority === 'medium' && 'border-l-2 border-l-yellow-500'
                    )}
                    style={{
                      transform: swipingId === notification.id ? `translateX(${swipeOffset}px)` : 'translateX(0)',
                      transition: swipingId === notification.id ? 'none' : 'transform 0.2s ease-out'
                    }}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {notification.amount && (
                            <span className="text-xs font-medium text-primary">
                              {formatCurrency(notification.amount)}
                            </span>
                          )}
                          {notification.dueDate && (
                            <span className={cn(
                              'text-xs flex items-center gap-1',
                              notification.isOverdue ? 'text-destructive font-medium' : 'text-muted-foreground'
                            )}>
                              <Calendar className="w-3 h-3" />
                              {formatDate(notification.dueDate)}
                            </span>
                          )}
                        </div>
                        
                        {/* Quick actions for reminders */}
                        {notification.type === 'reminder' && notification.reminderData && (
                          <div className="flex items-center gap-1 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2"
                              onClick={(e) => handleCompleteReminder(notification, e)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Concluir
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={(e) => handlePostponeReminder(notification, 1, e)}
                            >
                              +1 dia
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={(e) => handlePostponeReminder(notification, 7, e)}
                            >
                              +1 sem
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete button for non-reminder notifications */}
                      {notification.type !== 'reminder' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0 opacity-50 hover:opacity-100"
                          onClick={(e) => handleDeleteNotification(notification, e)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t bg-muted/30">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs justify-between"
            onClick={() => {
              setOpen(false);
              navigate('/reminders');
            }}
          >
            Ver todos os lembretes
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}