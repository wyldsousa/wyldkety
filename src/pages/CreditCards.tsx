import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, CreditCard as CreditCardIcon, FastForward, DollarSign } from 'lucide-react';
import { useCreditCards, useCreditCardInvoices, useCreditCardTransactions } from '@/hooks/useCreditCards';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { formatCurrency } from '@/lib/format';
import { CARD_COLORS, CreditCard, CreditCardInvoice } from '@/types/creditCard';
import { CreditCardItem } from '@/components/CreditCard/CreditCardItem';

export default function CreditCards() {
  const { cards, isLoading, createCard, updateCard, deleteCard } = useCreditCards();
  const { invoices, payInvoice, partialPayInvoice } = useCreditCardInvoices();
  const { transactions, prepayInstallments } = useCreditCardTransactions();
  const { accounts } = useBankAccounts();
  const [open, setOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [prepayOpen, setPrepayOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CreditCardInvoice | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');

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
    const invoiceTotal = Number(selectedInvoice.total_amount);
    const alreadyPaid = Number(selectedInvoice.paid_amount) || 0;
    const remaining = invoiceTotal - alreadyPaid;
    
    if (paymentType === 'full' || amount >= remaining) {
      await payInvoice.mutateAsync({
        invoiceId: selectedInvoice.id,
        accountId,
        amount: remaining
      });
    } else {
      await partialPayInvoice.mutateAsync({
        invoiceId: selectedInvoice.id,
        accountId,
        amount
      });
    }
    
    setPayOpen(false);
    setSelectedInvoice(null);
    setPaymentType('full');
  };

  const handlePrepayInstallments = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTransaction) return;
    
    const formData = new FormData(e.currentTarget);
    const accountId = formData.get('account_id') as string;
    const installmentsToPayStr = formData.get('installments_to_pay') as string;
    const installmentsToPay = installmentsToPayStr === 'all' 
      ? (selectedTransaction.total_installments - selectedTransaction.installment_number)
      : parseInt(installmentsToPayStr);
    
    await prepayInstallments.mutateAsync({
      transaction: selectedTransaction,
      accountId,
      installmentsToPay
    });
    
    setPrepayOpen(false);
    setSelectedTransaction(null);
  };

  const openEditDialog = (card: CreditCard) => {
    setEditingCard(card);
    setOpen(true);
  };

  const openPayDialog = (invoice: CreditCardInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentType('full');
    setPayOpen(true);
  };

  const openPrepayDialog = (transaction: any) => {
    setSelectedTransaction(transaction);
    setPrepayOpen(true);
  };

  const getCardInvoices = (cardId: string) => {
    return invoices.filter(i => i.card_id === cardId);
  };

  const getCardTransactions = (cardId: string) => {
    return transactions.filter(t => t.card_id === cardId);
  };

  const getUsedLimit = (cardId: string) => {
    return getCardInvoices(cardId)
      .filter(i => i.status === 'open' || i.status === 'closed' || i.status === 'partial')
      .reduce((sum, i) => {
        const paid = Number(i.paid_amount) || 0;
        return sum + (Number(i.total_amount) - paid);
      }, 0);
  };

  const getInvoiceRemaining = (invoice: CreditCardInvoice) => {
    return Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0);
  };

  const handleToggleExpand = (cardId: string) => {
    setExpandedCardId(prev => prev === cardId ? null : cardId);
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
            {selectedInvoice && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Valor Total</span>
                  <span className="font-medium">{formatCurrency(Number(selectedInvoice.total_amount))}</span>
                </div>
                {(Number(selectedInvoice.paid_amount) || 0) > 0 && (
                  <>
                    <div className="flex justify-between text-primary">
                      <span className="text-sm">Já Pago</span>
                      <span className="font-medium">{formatCurrency(Number(selectedInvoice.paid_amount))}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Restante</span>
                      <span>{formatCurrency(getInvoiceRemaining(selectedInvoice))}</span>
                    </div>
                  </>
                )}
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentType === 'full' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setPaymentType('full')}
              >
                Pagamento Total
              </Button>
              <Button
                type="button"
                variant={paymentType === 'partial' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setPaymentType('partial')}
              >
                Pagamento Parcial
              </Button>
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
                min="0.01"
                max={selectedInvoice ? getInvoiceRemaining(selectedInvoice) : undefined}
                defaultValue={selectedInvoice ? (paymentType === 'full' ? getInvoiceRemaining(selectedInvoice) : '') : ''}
                key={paymentType}
                required 
              />
              {paymentType === 'partial' && (
                <p className="text-xs text-muted-foreground">
                  Pagamento parcial libera limite proporcional
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={payInvoice.isPending || partialPayInvoice?.isPending}>
              Confirmar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Prepay Installments Dialog */}
      <Dialog open={prepayOpen} onOpenChange={setPrepayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Antecipar Parcelas</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePrepayInstallments} className="space-y-4">
            {selectedTransaction && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedTransaction.description}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parcela atual</span>
                  <span>{selectedTransaction.installment_number}/{selectedTransaction.total_installments}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor da parcela</span>
                  <span>{formatCurrency(Number(selectedTransaction.amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Parcelas restantes</span>
                  <span>{selectedTransaction.total_installments - selectedTransaction.installment_number}</span>
                </div>
              </div>
            )}

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
              <Label htmlFor="installments_to_pay">Parcelas a Antecipar</Label>
              <Select name="installments_to_pay" required defaultValue="1">
                <SelectTrigger>
                  <SelectValue placeholder="Quantas parcelas?" />
                </SelectTrigger>
                <SelectContent>
                  {selectedTransaction && Array.from(
                    { length: selectedTransaction.total_installments - selectedTransaction.installment_number },
                    (_, i) => i + 1
                  ).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} parcela{num > 1 ? 's' : ''} - {formatCurrency(num * Number(selectedTransaction.amount))}
                    </SelectItem>
                  ))}
                  <SelectItem value="all">
                    Todas restantes - {selectedTransaction && formatCurrency(
                      (selectedTransaction.total_installments - selectedTransaction.installment_number) * Number(selectedTransaction.amount)
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={prepayInstallments?.isPending}>
              <FastForward className="w-4 h-4 mr-2" />
              Confirmar Antecipação
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <CreditCardItem
              key={card.id}
              card={card}
              invoices={getCardInvoices(card.id)}
              transactions={getCardTransactions(card.id)}
              usedLimit={getUsedLimit(card.id)}
              isExpanded={expandedCardId === card.id}
              onToggleExpand={() => handleToggleExpand(card.id)}
              onEdit={openEditDialog}
              onDelete={(cardId) => deleteCard.mutate(cardId)}
              onPayInvoice={openPayDialog}
              onPrepayInstallments={openPrepayDialog}
            />
          ))}
        </div>
      )}
    </div>
  );
}
