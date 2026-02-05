import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Calendar, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Megaphone,
  Settings,
  Smartphone
} from 'lucide-react';
import { useReminders } from '@/hooks/useReminders';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function News() {
  const { reminders } = useReminders();
  const { 
    notifications, 
    pushEnabled, 
    togglePushNotifications, 
    markAsRead, 
    markAllAsRead,
    unreadCount 
  } = useNotifications();
  const [activeTab, setActiveTab] = useState('all');

  // Convert reminders to notifications format
  const reminderNotifications = useMemo(() => {
    const now = new Date();
    return reminders.map(reminder => {
      const dueDate = reminder.due_date ? new Date(reminder.due_date) : null;
      const isOverdue = dueDate && dueDate < now && !reminder.is_completed;
      const isDueSoon = dueDate && !isOverdue && !reminder.is_completed && 
        (dueDate.getTime() - now.getTime()) < 3 * 24 * 60 * 60 * 1000; // 3 days

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
        isCompleted: reminder.is_completed,
        priority,
        createdAt: reminder.created_at,
        read: reminder.is_completed,
        reminderId: reminder.id,
      };
    }).sort((a, b) => {
      // Sort by priority first (high > medium > low), then by date
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reminders]);

  // Combine all notifications
  const allNotifications = useMemo(() => {
    const combined = [
      ...reminderNotifications,
      ...notifications.map(n => ({
        ...n,
        type: n.type as 'system' | 'update' | 'reminder',
        priority: 'low' as const,
        isOverdue: false,
        isDueSoon: false,
        isCompleted: false,
      }))
    ].sort((a, b) => {
      // Reminders with high priority first
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return combined;
  }, [reminderNotifications, notifications]);

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'reminders':
        return allNotifications.filter(n => n.type === 'reminder');
      case 'updates':
        return allNotifications.filter(n => n.type === 'update' || n.type === 'system');
      case 'unread':
        return allNotifications.filter(n => !n.read && !n.isCompleted);
      default:
        return allNotifications;
    }
  }, [allNotifications, activeTab]);

  const getNotificationIcon = (notification: typeof allNotifications[0]) => {
    if (notification.type === 'reminder') {
      if (notification.isOverdue) return <AlertCircle className="w-5 h-5 text-destructive" />;
      if (notification.isDueSoon) return <Clock className="w-5 h-5 text-yellow-500" />;
      if (notification.isCompleted) return <CheckCircle2 className="w-5 h-5 text-primary" />;
      return <Bell className="w-5 h-5 text-muted-foreground" />;
    }
    if (notification.type === 'update') return <Megaphone className="w-5 h-5 text-primary" />;
    return <Bell className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Novidades</h1>
          <p className="text-muted-foreground">Notificações, lembretes e atualizações</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            Marcar todas como lidas
          </Button>
        )}
      </div>

      {/* Push Notifications Settings */}
      <Card className="shadow-soft border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Notificações no Celular
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications" className="text-sm font-medium">
                Notificações Push
              </Label>
              <p className="text-xs text-muted-foreground">
                Receba alertas de lembretes e vencimentos mesmo com o app fechado
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushEnabled}
              onCheckedChange={togglePushNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            Todas
            {allNotifications.length > 0 && (
              <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                {allNotifications.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="reminders">
            Lembretes
          </TabsTrigger>
          <TabsTrigger value="updates">
            Novidades
          </TabsTrigger>
          <TabsTrigger value="unread">
            Não lidas
            {unreadCount > 0 && (
              <span className="ml-1.5 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <Card className="shadow-soft border-0">
              <CardContent className="p-12 text-center">
                <BellOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhuma notificação
                </h3>
                <p className="text-muted-foreground">
                  {activeTab === 'reminders' 
                    ? 'Crie lembretes para receber notificações de vencimentos'
                    : activeTab === 'unread'
                    ? 'Todas as notificações foram lidas'
                    : 'Você não tem notificações no momento'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={cn(
                    'shadow-soft border-0 transition-all cursor-pointer hover:shadow-md',
                    !notification.read && !notification.isCompleted && 'bg-primary/5 border-l-4 border-l-primary',
                    notification.isOverdue && 'bg-destructive/5 border-l-4 border-l-destructive'
                  )}
                  onClick={() => {
                    if (!notification.read && notification.type !== 'reminder') {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            'font-semibold text-foreground',
                            notification.isCompleted && 'line-through text-muted-foreground'
                          )}>
                            {notification.title}
                          </h4>
                          {notification.priority === 'high' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive flex-shrink-0">
                              Urgente
                            </span>
                          )}
                          {notification.priority === 'medium' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">
                              Em breve
                            </span>
                          )}
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          {notification.amount && (
                            <div className="flex items-center gap-1 text-sm">
                              <DollarSign className="w-4 h-4 text-primary" />
                              <span className="font-medium">{formatCurrency(notification.amount)}</span>
                            </div>
                          )}
                          {notification.dueDate && (
                            <div className={cn(
                              'flex items-center gap-1 text-sm',
                              notification.isOverdue ? 'text-destructive' : 'text-muted-foreground'
                            )}>
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(notification.dueDate)}</span>
                              {notification.isOverdue && (
                                <span className="text-xs font-medium">(vencido)</span>
                              )}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
