import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Edit2, ArrowRight, Calendar, Tag, Repeat, CreditCard } from 'lucide-react';
import { PendingTransaction } from './types';
import { formatCurrency } from '@/lib/format';
import { useState } from 'react';

interface TransactionPreviewProps {
  transaction: PendingTransaction;
  accounts: Array<{ id: string; name: string; bank_name: string }>;
  categories: { income: string[]; expense: string[] };
  onConfirm: (transaction: PendingTransaction) => void;
  onCancel: () => void;
  onEdit: (transaction: PendingTransaction) => void;
  isLoading?: boolean;
}

export function TransactionPreview({
  transaction,
  accounts,
  categories,
  onConfirm,
  onCancel,
  onEdit,
  isLoading
}: TransactionPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<PendingTransaction>(transaction);

  const handleSaveEdit = () => {
    onEdit(editedTransaction);
    setIsEditing(false);
  };

  const typeLabels = {
    income: { label: 'Receita', color: 'text-income', bg: 'bg-income/10' },
    expense: { label: 'Despesa', color: 'text-expense', bg: 'bg-expense/10' },
    transfer: { label: 'Transferência', color: 'text-primary', bg: 'bg-primary/10' }
  };

  const typeInfo = typeLabels[transaction.type];
  const categoryList = transaction.type === 'income' ? categories.income : categories.expense;

  if (isEditing) {
    return (
      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Editar Transação</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Valor</label>
              <Input
                type="number"
                value={editedTransaction.amount}
                onChange={(e) => setEditedTransaction({ ...editedTransaction, amount: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select
                value={editedTransaction.type}
                onValueChange={(value: 'income' | 'expense') => setEditedTransaction({ ...editedTransaction, type: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Select
                value={editedTransaction.category}
                onValueChange={(value) => setEditedTransaction({ ...editedTransaction, category: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoryList.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Conta</label>
              <Select
                value={editedTransaction.account_id}
                onValueChange={(value) => {
                  const account = accounts.find(a => a.id === value);
                  setEditedTransaction({ 
                    ...editedTransaction, 
                    account_id: value,
                    account_name: account?.name
                  });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Descrição</label>
            <Input
              value={editedTransaction.description}
              onChange={(e) => setEditedTransaction({ ...editedTransaction, description: e.target.value })}
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Data</label>
              <Input
                type="date"
                value={editedTransaction.date}
                onChange={(e) => setEditedTransaction({ ...editedTransaction, date: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Parcelas</label>
              <Input
                type="number"
                min={1}
                max={48}
                value={editedTransaction.installments || 1}
                onChange={(e) => setEditedTransaction({ ...editedTransaction, installments: parseInt(e.target.value) || 1 })}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveEdit} size="sm" className="flex-1">
              Salvar Alterações
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-card to-muted/30 backdrop-blur shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
            {typeInfo.label}
          </div>
          <span className="text-xs text-muted-foreground">Aguardando confirmação</span>
        </div>

        <div className="space-y-3">
          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Valor</span>
            <span className={`text-xl font-bold ${typeInfo.color}`}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
            </span>
          </div>

          {/* Transfer accounts */}
          {transaction.type === 'transfer' && (
            <div className="flex items-center justify-between py-2 border-y border-border/50">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{transaction.account_name}</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{transaction.transfer_to_account_name}</span>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Descrição</span>
            <span className="text-sm font-medium">{transaction.description}</span>
          </div>

          {/* Category */}
          {transaction.category && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Tag className="w-3 h-3" /> Categoria
              </span>
              <span className="text-sm">{transaction.category}</span>
            </div>
          )}

          {/* Account */}
          {transaction.type !== 'transfer' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Conta
              </span>
              <span className="text-sm">{transaction.account_name}</span>
            </div>
          )}

          {/* Date */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Data
            </span>
            <span className="text-sm">
              {new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>
          </div>

          {/* Installments */}
          {transaction.installments && transaction.installments > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Parcelas</span>
              <span className="text-sm">
                {transaction.installments}x de {formatCurrency(transaction.amount / transaction.installments)}
              </span>
            </div>
          )}

          {/* Recurrence */}
          {transaction.recurrence && transaction.recurrence !== 'none' && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <Repeat className="w-3 h-3" /> Recorrência
              </span>
              <span className="text-sm capitalize">
                {transaction.recurrence === 'weekly' && 'Semanal'}
                {transaction.recurrence === 'monthly' && 'Mensal'}
                {transaction.recurrence === 'yearly' && 'Anual'}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
          <Button
            onClick={() => onConfirm(transaction)}
            disabled={isLoading}
            className="flex-1 bg-income hover:bg-income/90"
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            Confirmar
          </Button>
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            disabled={isLoading}
            className="text-destructive hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
