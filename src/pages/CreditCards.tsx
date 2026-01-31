import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, CreditCard as CreditCardIcon, Pencil, Trash2, Calendar, DollarSign, Receipt, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { useCreditCards, useCreditCardInvoices, useCreditCardTransactions } from '@/hooks/useCreditCards';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency, formatDate } from '@/lib/format';
import { CARD_COLORS, CreditCard } from '@/types/creditCard';
import { getBankInfo } from '@/lib/bankLogos';

export default function CreditCards() {
  const { cards, isLoading, createCard, updateCard, deleteCard } = useCreditCards();
  const { invoices, payInvoice } = useCreditCardInvoices();
  const { accounts } = useBankAccounts();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      bank_name: formData.get('bank_name') as string,
      credit_limit: parseFloat(formData.get('credit_limit') as string) || 0,
      closing_day: parseInt(formData.get('closing_day') as string) || 1,
      due_day: parseInt(formData.get('due_day') as string) || 10,
      interest_rate: formData.get('interest_rate') ? parseFloat(formData.get('interest_rate') as string) : null,
      color: formData.get('color') as string || CARD_COLORS[0],
      image_url: null,
    };

    if (editingCard) {
      await updateCard.mutateAsync({ id: editingCard.id, ...data });
    } else {
      await createCard.mutateAsync(data);
    }
    setOpen(false);
    setEditingCard(null);
  };

  const handlePayInvoice = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    
    const formData = new FormData(e.currentTarget);
    const accountId = formData.get('account_id') as string;
    const amount = parseFloat(formData.get('amount') as string);
    
    await payInvoice.mutateAsync({
      invoiceId: selectedInvoice.id,
      accountId,
      amount
    });
    
    setPayOpen(false);
    setSelectedInvoice(null);
  };

  const openEditDialog = (card: CreditCard) => {
    setEditingCard(card);
    setOpen(true);
  };

  const openPayDialog = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPayOpen(true);
  };

  const getCardInvoices = (cardId: string) => {
    return invoices.filter(i => i.card_id === cardId);
  };

  const getCurrentInvoice = (cardId: string) => {
    const now = new Date();
    return invoices.find(i => 
      i.card_id === cardId && 
      i.month === now.getMonth() + 1 && 
      i.year === now.getFullYear() &&
      i.status !== 'paid'
    );
  };

  const getUsedLimit = (cardId: string) => {
    return getCardInvoices(cardId)
      .filter(i => i.status === 'open' || i.status === 'closed')
      .reduce((sum, i) => sum + Number(i.total_amount), 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700"><Clock className="w-3 h-3" /> Aberta</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3" /> Fechada</span>;
      case 'paid':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3" /> Paga</span>;
      case 'overdue':
        return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700"><AlertCircle className="w-3 h-3" /> Vencida</span>;
      default:
        return null;
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month - 1];
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cartões de Crédito</h1>
          <p className="text-muted-foreground">Gerencie seus cartões e faturas</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditingCard(null); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCard ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cartão</Label>
                <Input 
                  id="name" 
                  name="name" 
                  placeholder="Ex: Nubank Platinum" 
                  defaultValue={editingCard?.name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_name">Banco/Bandeira</Label>
                <Input 
                  id="bank_name" 
                  name="bank_name" 
                  placeholder="Ex: Nubank" 
                  defaultValue={editingCard?.bank_name}
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Limite Total</Label>
                <Input 
                  id="credit_limit" 
                  name="credit_limit" 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="5000.00"
                  defaultValue={editingCard?.credit_limit}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closing_day">Dia de Fechamento</Label>
                  <Input 
                    id="closing_day" 
                    name="closing_day" 
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    defaultValue={editingCard?.closing_day || 15}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_day">Dia de Vencimento</Label>
                  <Input 
                    id="due_day" 
                    name="due_day" 
                    type="number"
                    min="1"
                    max="31"
                    placeholder="22"
                    defaultValue={editingCard?.due_day || 22}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest_rate">Taxa de Juros (% a.m.) - Opcional</Label>
                <Input 
                  id="interest_rate" 
                  name="interest_rate" 
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="14.99"
                  defaultValue={editingCard?.interest_rate || ''}
                />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {CARD_COLORS.map((color) => (
                    <label key={color} className="cursor-pointer">
                      <input 
                        type="radio" 
                        name="color" 
                        value={color} 
                        defaultChecked={editingCard?.color === color || (!editingCard && color === CARD_COLORS[0])}
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
              <Button type="submit" className="w-full" disabled={createCard.isPending || updateCard.isPending}>
                {editingCard ? 'Salvar Alterações' : 'Criar Cartão'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pay Invoice Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pagar Fatura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePayInvoice} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Valor da Fatura</p>
              <p className="text-2xl font-bold">{selectedInvoice && formatCurrency(Number(selectedInvoice.total_amount))}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="account_id">Conta para Pagamento</Label>
              <Select name="account_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(Number(account.balance))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do Pagamento</Label>
              <Input 
                id="amount" 
                name="amount" 
                type="number" 
                step="0.01"
                min="0"
                defaultValue={selectedInvoice?.total_amount}
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={payInvoice.isPending}>
              Confirmar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>

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
      ) : cards.length === 0 ? (
        <Card className="shadow-soft border-0">
          <CardContent className="p-12 text-center">
            <CreditCardIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum cartão cadastrado</h3>
            <p className="text-muted-foreground mb-4">Adicione seu primeiro cartão de crédito</p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Adicionar Cartão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const usedLimit = getUsedLimit(card.id);
              const availableLimit = Number(card.credit_limit) - usedLimit;
              const usagePercent = (usedLimit / Number(card.credit_limit)) * 100;
              const bankInfo = getBankInfo(card.bank_name);

              return (
                <Card 
                  key={card.id} 
                  className={`shadow-soft border-0 overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${selectedCardId === card.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedCardId(selectedCardId === card.id ? null : card.id)}
                >
                  <div 
                    className="h-24 p-4 flex flex-col justify-between"
                    style={{ backgroundColor: card.color }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white/80 text-xs">Limite disponível</p>
                        <p className="text-white text-xl font-bold">{formatCurrency(availableLimit)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
                          onClick={(e) => { e.stopPropagation(); openEditDialog(card); }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-white/80 hover:text-white hover:bg-white/20 h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Todas as faturas e compras serão excluídas. Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteCard.mutate(card.id)} 
                                className="bg-destructive text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bankInfo.logo ? (
                        <img src={bankInfo.logo} alt={card.bank_name} className="h-4 brightness-0 invert opacity-80" />
                      ) : null}
                      <span className="text-white/80 text-xs">{card.bank_name}</span>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{card.name}</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Usado</span>
                        <span className="font-medium">{formatCurrency(usedLimit)}</span>
                      </div>
                      <Progress value={usagePercent} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Fecha dia {card.closing_day}</span>
                        <span>Vence dia {card.due_day}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Invoices Section */}
          {selectedCardId && (
            <Card className="shadow-soft border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Faturas de {cards.find(c => c.id === selectedCardId)?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {getCardInvoices(selectedCardId).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma fatura encontrada
                  </p>
                ) : (
                  <div className="space-y-3">
                    {getCardInvoices(selectedCardId).map((invoice) => (
                      <div 
                        key={invoice.id} 
                        className="p-4 rounded-lg border border-border flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <span className="font-bold text-foreground">
                              {getMonthName(invoice.month)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">
                              {getMonthName(invoice.month)} {invoice.year}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(Number(invoice.total_amount))}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(invoice.status)}
                          {(invoice.status === 'closed' || invoice.status === 'overdue') && (
                            <Button 
                              size="sm" 
                              onClick={() => openPayDialog(invoice)}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
