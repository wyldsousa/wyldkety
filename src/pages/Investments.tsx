import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, TrendingUp, ArrowUpRight, ArrowDownRight, Pencil, Trash2 } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/lib/format';
import { BANK_COLORS } from '@/types/finance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Investments() {
  const { investmentAccounts, regularAccounts, isLoading, createAccount, updateAccount, deleteAccount } = useBankAccounts();
  const { createTransaction } = useTransactions();
  const [openNewAccount, setOpenNewAccount] = useState(false);
  const [openOperation, setOpenOperation] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [operationType, setOperationType] = useState<'deposit' | 'withdraw'>('deposit');

  const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      bank_name: formData.get('bank_name') as string,
      account_type: 'investment' as const,
      balance: parseFloat(formData.get('balance') as string) || 0,
      color: formData.get('color') as string || BANK_COLORS[3],
      icon: 'trending-up',
      is_investment: true,
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({ id: editingAccount.id, ...data });
    } else {
      await createAccount.mutateAsync(data);
    }
    setOpenNewAccount(false);
    setEditingAccount(null);
  };

  const handleOperation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fromAccountId = formData.get('from_account') as string;
    const toAccountId = selectedAccount;
    const amount = parseFloat(formData.get('amount') as string);

    if (operationType === 'deposit') {
      // Transfer from regular account to investment
      await createTransaction.mutateAsync({
        account_id: fromAccountId,
        type: 'transfer',
        category: 'Transferência',
        description: `Aporte para investimento`,
        amount,
        date: new Date().toISOString().split('T')[0],
        transfer_to_account_id: toAccountId,
      });
    } else {
      // Transfer from investment to regular account
      await createTransaction.mutateAsync({
        account_id: toAccountId,
        type: 'transfer',
        category: 'Transferência',
        description: `Resgate de investimento`,
        amount,
        date: new Date().toISOString().split('T')[0],
        transfer_to_account_id: fromAccountId,
      });
    }
    setOpenOperation(false);
  };

  const openEditDialog = (account: any) => {
    setEditingAccount(account);
    setOpenNewAccount(true);
  };

  const handleDelete = async (id: string) => {
    await deleteAccount.mutateAsync(id);
  };

  const openOperationDialog = (accountId: string, type: 'deposit' | 'withdraw') => {
    setSelectedAccount(accountId);
    setOperationType(type);
    setOpenOperation(true);
  };

  const totalInvestments = investmentAccounts.reduce((sum, a) => sum + Number(a.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investimentos</h1>
          <p className="text-muted-foreground">Gerencie seus investimentos</p>
        </div>
        <Dialog open={openNewAccount} onOpenChange={(o) => { setOpenNewAccount(o); if (!o) setEditingAccount(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 gradient-investment">
              <Plus className="w-4 h-4" />
              Novo Investimento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingAccount ? 'Editar Investimento' : 'Novo Investimento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Investimento</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ex: Tesouro Direto, CDB" 
                  defaultValue={editingAccount?.name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Corretora/Banco</Label>
                <Input 
                  id="bank_name" 
                  name="bank_name" 
                  placeholder="Ex: XP, Nubank" 
                  defaultValue={editingAccount?.bank_name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Valor Inicial</Label>
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
                        defaultChecked={editingAccount?.color === color || (!editingAccount && color === BANK_COLORS[3])}
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
              <Button type="submit" className="w-full gradient-investment" disabled={createAccount.isPending || updateAccount.isPending}>
                {editingAccount ? 'Salvar Alterações' : 'Criar Investimento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Total Card */}
      <Card className="shadow-soft border-0 overflow-hidden">
        <div className="h-2 gradient-investment" />
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl gradient-investment">
              <TrendingUp className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total em Investimentos</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalInvestments)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Investment Accounts */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Card key={i} className="shadow-soft border-0 animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : investmentAccounts.length === 0 ? (
        <Card className="shadow-soft border-0">
          <CardContent className="p-12 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum investimento cadastrado</h3>
            <p className="text-muted-foreground mb-4">Adicione seu primeiro investimento para acompanhar</p>
            <Button onClick={() => setOpenNewAccount(true)} className="gap-2 gradient-investment">
              <Plus className="w-4 h-4" />
              Adicionar Investimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {investmentAccounts.map((account) => (
            <Card key={account.id} className="shadow-soft border-0 overflow-hidden">
              <div className="h-2" style={{ backgroundColor: account.color }} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${account.color}20` }}
                    >
                      <TrendingUp className="w-6 h-6" style={{ color: account.color }} />
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
                          <AlertDialogTitle>Excluir investimento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita.
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
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(Number(account.balance))}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => openOperationDialog(account.id, 'deposit')}
                    disabled={regularAccounts.length === 0}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Aportar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={() => openOperationDialog(account.id, 'withdraw')}
                    disabled={regularAccounts.length === 0}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    Resgatar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Operation Dialog */}
      <Dialog open={openOperation} onOpenChange={setOpenOperation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {operationType === 'deposit' ? 'Aportar em Investimento' : 'Resgatar Investimento'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOperation} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from_account">
                {operationType === 'deposit' ? 'Conta de Origem' : 'Conta de Destino'}
              </Label>
              <Select name="from_account" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {regularAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(Number(account.balance))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor</Label>
              <Input 
                id="amount" 
                name="amount" 
                type="number" 
                step="0.01" 
                min="0.01"
                placeholder="0.00" 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={createTransaction.isPending}>
              {operationType === 'deposit' ? 'Confirmar Aporte' : 'Confirmar Resgate'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
