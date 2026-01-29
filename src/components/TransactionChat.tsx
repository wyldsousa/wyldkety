import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader2, CheckCircle, AlertCircle, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useTransactions } from '@/hooks/useTransactions';
import { useUserProgress, XP_REWARDS } from '@/hooks/useUserProgress';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  transaction?: {
    type: string;
    amount: number;
    category: string;
    description: string;
  };
  status?: 'pending' | 'success' | 'error';
}

export function TransactionChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Olá! 👋 Sou seu assistente financeiro. Me diga suas transações de forma natural, como:\n\n• "Gastei 50 reais no mercado"\n• "Recebi 3000 de salário"\n• "Paguei 150 de conta de luz"',
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { accounts } = useBankAccounts();
  const { incomeCategories, expenseCategories } = useCategories();
  const { createTransaction } = useTransactions();
  const { incrementTransactionCount } = useUserProgress();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (accounts.length === 0) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: '⚠️ Você precisa criar uma conta bancária primeiro antes de registrar transações.',
          status: 'error'
        }]);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('parse-transaction', {
        body: {
          message: input,
          accounts: accounts.map(a => ({ id: a.id, name: a.name, bank_name: a.bank_name })),
          categories: {
            income: incomeCategories,
            expense: expenseCategories
          }
        }
      });

      if (error) throw error;

      if (data.error) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          type: 'assistant',
          content: `❌ ${data.error}`,
          status: 'error'
        }]);
        return;
      }

      const transaction = data.transaction;
      const accountId = transaction.account_id || accounts[0].id;

      // Create the transaction
      await createTransaction.mutateAsync({
        account_id: accountId,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        amount: transaction.amount,
        date: new Date().toISOString().split('T')[0],
        transfer_to_account_id: null,
      });

      // Add XP for creating transaction
      try {
        await incrementTransactionCount.mutateAsync();
      } catch (e) {
        console.log('XP update skipped');
      }

      const accountName = accounts.find(a => a.id === accountId)?.name || 'sua conta';
      const typeLabel = transaction.type === 'income' ? 'Receita' : 'Despesa';
      const emoji = transaction.type === 'income' ? '💰' : '💸';

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `${emoji} ${typeLabel} registrada com sucesso!\n\n📝 ${transaction.description}\n💵 ${formatCurrency(transaction.amount)}\n📁 ${transaction.category}\n🏦 ${accountName}\n\n+${XP_REWARDS.TRANSACTION} XP ganhos! 🎮`,
        transaction: transaction,
        status: 'success'
      }]);

      toast.success('Transação registrada!');

    } catch (error: any) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `❌ Erro ao processar: ${error.message || 'Tente novamente'}`,
        status: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-soft border-0 h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="p-2 rounded-lg gradient-primary">
            <Bot className="w-4 h-4 text-primary-foreground" />
          </div>
          Assistente de Transações
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 pt-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.type === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-br-md' 
                    : msg.status === 'error'
                    ? 'bg-destructive/10 text-destructive rounded-bl-md'
                    : msg.status === 'success'
                    ? 'bg-income/10 text-foreground rounded-bl-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                {msg.status === 'success' && (
                  <div className="flex items-center gap-1 mt-2 text-income">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-xs">Registrado</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Gastei 50 no mercado..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
