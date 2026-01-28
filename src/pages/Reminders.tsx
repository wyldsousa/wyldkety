import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Bell, BellOff, Pencil, Trash2, Calendar, DollarSign, CheckCircle2, Circle } from 'lucide-react';
import { useReminders, Reminder } from '@/hooks/useReminders';
import { formatCurrency, formatDate } from '@/lib/format';

export default function Reminders() {
  const { 
    pendingReminders, 
    completedReminders, 
    isLoading, 
    createReminder, 
    updateReminder,
    toggleReminder, 
    deleteReminder 
  } = useReminders();
  const [open, setOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || null,
      amount: formData.get('amount') ? parseFloat(formData.get('amount') as string) : null,
      due_date: formData.get('due_date') as string || null,
      is_completed: editingReminder?.is_completed || false,
    };

    if (editingReminder) {
      await updateReminder.mutateAsync({ id: editingReminder.id, ...data });
    } else {
      await createReminder.mutateAsync(data);
    }
    setOpen(false);
    setEditingReminder(null);
  };

  const openEditDialog = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setOpen(true);
  };

  const ReminderCard = ({ reminder }: { reminder: Reminder }) => {
    const isOverdue = reminder.due_date && !reminder.is_completed && new Date(reminder.due_date) < new Date();
    
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
            <h3 className={`font-semibold ${reminder.is_completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {reminder.title}
            </h3>
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
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingReminder(null); }}>
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

              <Button type="submit" className="w-full" disabled={createReminder.isPending || updateReminder.isPending}>
                {editingReminder ? 'Salvar Alterações' : 'Criar Lembrete'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="pending" className="gap-2">
            <Bell className="w-4 h-4" />
            Pendentes ({pendingReminders.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <BellOff className="w-4 h-4" />
            Concluídos ({completedReminders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <Card className="shadow-soft border-0">
              <CardContent className="p-8 text-center text-muted-foreground">
                Carregando...
              </CardContent>
            </Card>
          ) : pendingReminders.length === 0 ? (
            <Card className="shadow-soft border-0">
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lembrete pendente</h3>
                <p className="text-muted-foreground mb-4">Crie um lembrete para não esquecer suas contas</p>
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Lembrete
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingReminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {completedReminders.length === 0 ? (
            <Card className="shadow-soft border-0">
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum lembrete concluído</h3>
                <p className="text-muted-foreground">Os lembretes concluídos aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {completedReminders.map(reminder => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
