import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Bell, BellOff, Pencil, Trash2, Calendar, DollarSign, CheckCircle2, Circle, ChevronLeft, ChevronRight, Repeat, AlertCircle } from 'lucide-react';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { formatCurrency, formatDate } from '@/lib/format';

export default function Reminders() {
  const { 
    reminders,
    isLoading, 
    createReminder, 
    updateReminder,
    toggleReminder, 
    deleteReminder 
  } = useReminders();
  const [open, setOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  
  // Month navigation state
  const [currentDate, setCurrentDate] = useState(new Date());
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Filter and group reminders by month
  const { pendingReminders, completedReminders, overdueReminders } = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    
    const filtered = reminders.filter(r => {
      if (!r.due_date) return currentMonth === now.getMonth() && currentYear === now.getFullYear();
      const dueDate = new Date(r.due_date);
      return dueDate >= startOfMonth && dueDate <= endOfMonth;
    });

    const pending = filtered.filter(r => !r.is_completed && (!r.due_date || new Date(r.due_date) >= now));
    const overdue = filtered.filter(r => !r.is_completed && r.due_date && new Date(r.due_date) < now);
    const completed = filtered.filter(r => r.is_completed);

    return {
      pendingReminders: pending.sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }),
      completedReminders: completed,
      overdueReminders: overdue.sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    };
  }, [reminders, currentMonth, currentYear]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: any = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      amount: formData.get('amount') ? parseFloat(formData.get('amount') as string) : null,
      due_date: formData.get('due_date') as string || null,
      is_completed: editingReminder?.is_completed || false,
      is_recurring: isRecurring,
      recurrence_type: isRecurring ? (formData.get('recurrence_type') as string || 'monthly') : 'none',
      recurrence_day: formData.get('due_date') ? new Date(formData.get('due_date') as string).getDate() : null,
    };

    if (editingReminder) {
      await updateReminder.mutateAsync({ id: editingReminder.id, ...data });
    } else {
      await createReminder.mutateAsync(data);
    }
    setOpen(false);
    setEditingReminder(null);
    setIsRecurring(false);
  };

  const openEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsRecurring(reminder.is_recurring || false);
    setOpen(true);
  };

  const ReminderCard = ({ reminder, isOverdue = false }: { reminder: Reminder; isOverdue?: boolean }) => {
    return (
      <div 
        className={`p-4 rounded-xl border transition-all ${
          reminder.is_completed 
            ? 'bg-muted/30 border-muted' 
            : isOverdue 
              ? 'bg-destructive/5 border-destructive/30' 
              : 'bg-card border-border hover:shadow-md'
        }`}
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => toggleReminder.mutate(reminder)}
            className="mt-1 flex-shrink-0"
          >
            {reminder.is_completed ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <Circle className="w-6 h-6 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`font-semibold ${reminder.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {reminder.title}
              </h3>
              {reminder.is_recurring && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  <Repeat className="w-3 h-3" />
                  {reminder.recurrence_type === 'monthly' ? 'Mensal' : reminder.recurrence_type === 'weekly' ? 'Semanal' : 'Anual'}
                </span>
              )}
            </div>
            {reminder.description && (
              <p className="text-sm text-muted-foreground mt-1">{reminder.description}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-2">
              {reminder.amount && (
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">{formatCurrency(reminder.amount)}</span>
                </div>
              )}
              {reminder.due_date && (
                <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(reminder.due_date)}</span>
                  {isOverdue && <span className="text-xs font-medium">(vencido)</span>}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEditDialog(reminder)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir lembrete?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => deleteReminder.mutate(reminder.id)} 
                    className="bg-destructive text-destructive-foreground"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lembretes</h1>
          <p className="text-muted-foreground">Anote suas dívidas e compromissos</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingReminder(null); setIsRecurring(false); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Lembrete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingReminder ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input 
                  id="title" 
                  name="title" 
                  placeholder="Ex: Pagar conta de luz"
                  defaultValue={editingReminder?.title || ''}
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  placeholder="Detalhes adicionais..."
                  defaultValue={editingReminder?.description || ''}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor</Label>
                  <Input 
                    id="amount" 
                    name="amount" 
                    type="number" 
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    defaultValue={editingReminder?.amount || ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Vencimento</Label>
                  <Input 
                    id="due_date" 
                    name="due_date" 
                    type="date"
                    defaultValue={editingReminder?.due_date || ''}
                  />
                </div>
              </div>

              {/* Recurrence Section */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    <Label htmlFor="is_recurring" className="text-sm font-medium">Lembrete Recorrente</Label>
                  </div>
                  <Switch
                    id="is_recurring"
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                  />
                </div>
                
                {isRecurring && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrence_type">Repetir</Label>
                    <Select 
                      name="recurrence_type" 
                      defaultValue={editingReminder?.recurrence_type || 'monthly'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Frequência" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanalmente</SelectItem>
                        <SelectItem value="monthly">Mensalmente</SelectItem>
                        <SelectItem value="yearly">Anualmente</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O lembrete será criado automaticamente no próximo período após ser concluído.
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createReminder.isPending || updateReminder.isPending}>
                {editingReminder ? 'Salvar Alterações' : 'Criar Lembrete'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month Navigation */}
      <Card className="shadow-soft border-0">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <Button 
                variant="link" 
                size="sm" 
                className="text-xs text-muted-foreground"
                onClick={goToToday}
              >
                Ir para hoje
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="shadow-soft border-0">
          <CardContent className="p-8 text-center text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {overdueReminders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-semibold">Vencidos ({overdueReminders.length})</h3>
              </div>
              {overdueReminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} isOverdue />
              ))}
            </div>
          )}

          {/* Pending */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Bell className="w-5 h-5" />
              <h3 className="font-semibold">Próximos ({pendingReminders.length})</h3>
            </div>
            {pendingReminders.length === 0 ? (
              <Card className="shadow-soft border-0">
                <CardContent className="p-8 text-center">
                  <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum lembrete para este mês</p>
                </CardContent>
              </Card>
            ) : (
              pendingReminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))
            )}
          </div>

          {/* Completed */}
          {completedReminders.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="font-semibold">Concluídos ({completedReminders.length})</h3>
              </div>
              {completedReminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
