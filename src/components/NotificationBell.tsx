import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Calendar, DollarSign, AlertCircle, CheckCircle2, Clock, Megaphone, BellOff } from 'lucide-react';
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

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { reminders } = useReminders();
  const { 
    notifications, 
    markAsRead, 
    markAllAsRead,
    unreadCount: systemUnreadCount 
  } = useNotifications();

  // Convert reminders to notifications format
  const reminderNotifications = useMemo(() => {
    const now = new Date();
    return reminders
      .filter(r => !r.is_completed)
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
        };
      })
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [reminders]);

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
        }))
    ].slice(0, 10); // Show max 10 in dropdown
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

  const handleViewAll = () => {
    setOpen(false);
    navigate('/news');
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {totalUnread > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={handleMarkAllRead}
            >
              Marcar como lidas
            </Button>
          )}
        </div>
        
        <ScrollArea className="max-h-[300px]">
          {allNotifications.length === 0 ? (
            <div className="p-6 text-center">
              <BellOff className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma notificação
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {allNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 hover:bg-muted/50 transition-colors cursor-pointer',
                    notification.isOverdue && 'bg-destructive/5',
                    notification.priority === 'high' && 'border-l-2 border-l-destructive',
                    notification.priority === 'medium' && 'border-l-2 border-l-yellow-500'
                  )}
                  onClick={() => {
                    if (notification.type !== 'reminder') {
                      markAsRead(notification.id);
                    }
                    setOpen(false);
                    navigate('/news');
                  }}
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
                        <p className="text-xs text-muted-foreground truncate">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {notification.amount && (
                          <span className="text-xs font-medium text-primary">
                            {formatCurrency(notification.amount)}
                          </span>
                        )}
                        {notification.dueDate && (
                          <span className={cn(
                            'text-xs',
                            notification.isOverdue ? 'text-destructive' : 'text-muted-foreground'
                          )}>
                            {formatDate(notification.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs"
            onClick={handleViewAll}
          >
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
