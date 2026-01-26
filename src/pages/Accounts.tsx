import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency } from '@/lib/format';
import { BANK_COLORS } from '@/types/finance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function Accounts() {
  const { regularAccounts, isLoading, createAccount, updateAccount, deleteAccount } = useBankAccounts();
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const accountType = (formData.get('account_type') as string) || 'checking';
    const data = {
      name: formData.get('name') as string,
      bank_name: formData.get('bank_name') as string,
      account_type: accountType as 'checking' | 'savings' | 'investment',
      balance: parseFloat(formData.get('balance') as string) || 0,
      color: formData.get('color') as string || BANK_COLORS[0],
      icon: 'building-2',
      is_investment: false,
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
    } else {
      await createAccount.mutateAsync(data);
    }
    setOpen(false);
    setEditingAccount(null);
  };

  const openEditDialog = (account: any) => {
    setEditingAccount(account);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await deleteAccount.mutateAsync(id);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contas Bancárias</h1>
          <p className="text-muted-foreground">Gerencie suas contas</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingAccount(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conta</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ex: Conta Corrente" 
                  defaultValue={editingAccount?.name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Banco</Label>
                <Input 
                  id="bank_name" 
                  name="bank_name" 
                  placeholder="Ex: Nubank, Itaú" 
                  defaultValue={editingAccount?.bank_name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account_type">Tipo de Conta</Label>
                <Select name="account_type" defaultValue={editingAccount?.account_type || 'checking'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Conta Corrente</SelectItem>
                    <SelectItem value="savings">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Saldo Inicial</Label>
                <Input 
                  id="balance" 
                  name="balance" 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  defaultValue={editingAccount?.balance}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {BANK_COLORS.map((color) => (
                    <label key={color} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="color" 
                        value={color} 
                        defaultChecked={editingAccount?.color === color || (!editingAccount && color === BANK_COLORS[0])}
                        className="sr-only peer" 
                      />
                      <div 
                        className="w-8 h-8 rounded-full peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary transition-all"
                        style={{ backgroundColor: color }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createAccount.isPending || updateAccount.isPending}>
                {editingAccount ? 'Salvar Alterações' : 'Criar Conta'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="shadow-soft border-0 animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : regularAccounts.length === 0 ? (
        <Card className="shadow-soft border-0">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma conta cadastrada</h3>
            <p className="text-muted-foreground mb-4">Adicione sua primeira conta bancária para começar</p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {regularAccounts.map((account) => (
            <Card key={account.id} className="shadow-soft border-0 overflow-hidden">
              <div className="h-2" style={{ backgroundColor: account.color }} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <Building2 className="w-6 h-6" style={{ color: account.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{account.name}</h3>
                      <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(account)}>
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
                          <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todas as transações desta conta também serão excluídas. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(account.id)} className="bg-destructive text-destructive-foreground">
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(Number(account.balance))}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
