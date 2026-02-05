import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Pencil, Trash2, Receipt, CheckCircle2, AlertCircle, Clock, FastForward, DollarSign, ChevronDown } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { CreditCard, CreditCardInvoice } from '@/types/creditCard';
import { getBankInfo } from '@/lib/bankLogos';
import { cn } from '@/lib/utils';

interface CreditCardItemProps {
  card: CreditCard;
  invoices: CreditCardInvoice[];
  transactions: any[];
  usedLimit: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (card: CreditCard) => void;
  onDelete: (cardId: string) => void;
  onPayInvoice: (invoice: CreditCardInvoice) => void;
  onPrepayInstallments: (transaction: any) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open':
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700"><Clock className="w-3 h-3" /> Aberta</span>;
    case 'closed':
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700"><AlertCircle className="w-3 h-3" /> Fechada</span>;
    case 'partial':
      return <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700"><DollarSign className="w-3 h-3" /> Parcial</span>;
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

const getInvoiceRemaining = (invoice: CreditCardInvoice) => {
  return Number(invoice.total_amount) - (Number(invoice.paid_amount) || 0);
};

export function CreditCardItem({
  card,
  invoices,
  transactions,
  usedLimit,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onPayInvoice,
  onPrepayInstallments,
}: CreditCardItemProps) {
  const availableLimit = Number(card.credit_limit) - usedLimit;
  const usagePercent = (usedLimit / Number(card.credit_limit)) * 100;
  const bankInfo = getBankInfo(card.bank_name);

  const installmentTransactions = transactions.filter(
    t => t.total_installments && t.total_installments > 1 && t.installment_number < t.total_installments
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <Card className={cn(
        'shadow-soft border-0 overflow-hidden transition-all',
        isExpanded && 'ring-2 ring-primary'
      )}>
        {/* Card Header - Always visible */}
        <CollapsibleTrigger asChild>
          <div className="cursor-pointer">
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
                    onClick={(e) => { e.stopPropagation(); onEdit(card); }}
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
                          onClick={() => onDelete(card.id)} 
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
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
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
          </div>
        </CollapsibleTrigger>

        {/* Expanded Details - Rendered inside the card */}
        <CollapsibleContent>
          <div className="border-t border-border">
            {/* Invoices Section */}
            <div className="p-4 border-b border-border">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <Receipt className="w-4 h-4" />
                Faturas
              </h4>
              {invoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Nenhuma fatura encontrada
                </p>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div 
                      key={invoice.id} 
                      className="p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-md bg-background flex items-center justify-center">
                            <span className="font-bold text-foreground text-xs">
                              {getMonthName(invoice.month)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {getMonthName(invoice.month)} {invoice.year}
                            </p>
                            {getStatusBadge(invoice.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1 mb-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-medium">{formatCurrency(Number(invoice.total_amount))}</span>
                        </div>
                        {(Number(invoice.paid_amount) || 0) > 0 && (
                          <>
                            <div className="flex justify-between text-sm text-primary">
                              <span>Pago</span>
                              <span>{formatCurrency(Number(invoice.paid_amount))}</span>
                            </div>
                            <div className="flex justify-between text-sm font-medium">
                              <span>Restante</span>
                              <span>{formatCurrency(getInvoiceRemaining(invoice))}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {(invoice.status === 'open' || invoice.status === 'closed' || invoice.status === 'overdue' || invoice.status === 'partial') && 
                       getInvoiceRemaining(invoice) > 0 && (
                        <Button 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => { e.stopPropagation(); onPayInvoice(invoice); }}
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pagar Fatura
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Installment Transactions Section */}
            <div className="p-4">
              <h4 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <FastForward className="w-4 h-4" />
                Compras Parceladas
              </h4>
              {installmentTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Nenhuma compra parcelada ativa
                </p>
              ) : (
                <div className="space-y-3">
                  {installmentTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground text-sm">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">{transaction.category}</p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                          {transaction.installment_number}/{transaction.total_installments}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Valor da parcela</span>
                        <span className="font-medium">{formatCurrency(Number(transaction.amount))}</span>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="w-full"
                        onClick={(e) => { e.stopPropagation(); onPrepayInstallments(transaction); }}
                      >
                        <FastForward className="w-4 h-4 mr-1" />
                        Antecipar Parcelas
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
