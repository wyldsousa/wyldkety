import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { useUserProgress, XP_REWARDS } from '@/hooks/useUserProgress';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChatMessage, PendingTransaction } from './types';
import { ChatMessageComponent } from './ChatMessage';
import { TransactionPreview } from './TransactionPreview';
import { QuickActions } from './QuickActions';

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Olá! 👋 Sou o **Fin**, seu assistente financeiro pessoal.

Posso te ajudar a:
- 💰 **Registrar transações** em linguagem natural
- 📊 **Consultar seus gastos** e receitas
- 💡 **Dar insights** sobre suas finanças
- 🔄 **Criar transferências** entre contas

**Exemplos do que você pode me dizer:**
- "Gastei 50 reais no mercado"
- "Recebi 3000 de salário"
- "Comprei um celular de 2000 em 10x"
- "Quanto gastei este mês?"

Como posso te ajudar? 😊`,
  timestamp: new Date(),
};

export function FinancialAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { accounts } = useBankAccounts();
  const { incomeCategories, expenseCategories } = useCategories();
  const { incrementTransactionCount } = useUserProgress();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingTransaction, scrollToBottom]);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    // Add user message
    addMessage({ role: 'user', content: text });
    setInput('');
    setIsLoading(true);

    // Update conversation history
    const newHistory = [...conversationHistory, { role: 'user', content: text }];
    setConversationHistory(newHistory);

    try {
      if (accounts.length === 0) {
        addMessage({
          role: 'assistant',
          content: '⚠️ Você precisa criar pelo menos uma conta bancária antes de registrar transações. Vá para a aba **Contas** para criar.',
          status: 'error'
        });
        setIsLoading(false);
        return;
      }

      // Determine if this is a query or transaction creation
      const lowerText = text.toLowerCase();
      const isQuery = lowerText.includes('quanto') || 
                      lowerText.includes('resumo') || 
                      lowerText.includes('maiores') ||
                      lowerText.includes('sobrou') ||
                      lowerText.includes('saldo') ||
                      lowerText.includes('gastei') ||
                      lowerText.includes('ganhei') ||
                      lowerText.includes('dica');

      const { data, error } = await supabase.functions.invoke('financial-assistant', {
        body: {
          message: text,
          accounts: accounts.map(a => ({ id: a.id, name: a.name, bank_name: a.bank_name })),
          categories: {
            income: incomeCategories,
            expense: expenseCategories
          },
          userId: user?.id,
          action: isQuery ? 'query' : undefined,
          conversationHistory: newHistory.slice(-10)
        }
      });

      if (error) throw error;

      if (data.error) {
        addMessage({
          role: 'assistant',
          content: `❌ ${data.error}`,
          status: 'error'
        });
        return;
      }

      // Update conversation history with AI response
      if (data.ai_response) {
        setConversationHistory(prev => [...prev, { role: 'assistant', content: data.ai_response }]);
      }

      // Handle different actions
      switch (data.action) {
        case 'create_transaction':
          const accountName = accounts.find(a => a.id === data.data.account_id)?.name || 'Conta principal';
          const transaction: PendingTransaction = {
            type: data.data.type,
            amount: data.data.amount,
            category: data.data.category,
            description: data.data.description,
            account_id: data.data.account_id || accounts[0].id,
            account_name: accountName,
            date: data.data.date,
            installments: data.data.installments || 1,
            recurrence: data.data.recurrence || 'none'
          };
          
          addMessage({
            role: 'assistant',
            content: data.ai_response || `Entendi! Aqui está o resumo da transação. Por favor, confirme os dados:`,
            status: 'pending'
          });
          
          setPendingTransaction(transaction);
          break;

        case 'create_transfer':
          const fromAccount = accounts.find(a => a.id === data.data.from_account_id);
          const toAccount = accounts.find(a => a.id === data.data.to_account_id);
          
          const transfer: PendingTransaction = {
            type: 'transfer',
            amount: data.data.amount,
            description: data.data.description || 'Transferência entre contas',
            account_id: data.data.from_account_id,
            account_name: fromAccount?.name || 'Origem',
            transfer_to_account_id: data.data.to_account_id,
            transfer_to_account_name: toAccount?.name || 'Destino',
            date: data.data.date,
          };
          
          addMessage({
            role: 'assistant',
            content: data.ai_response || 'Entendi a transferência. Confirme os dados:',
            status: 'pending'
          });
          
          setPendingTransaction(transfer);
          break;

        case 'query_finances':
        case 'query_response':
          addMessage({
            role: 'assistant',
            content: data.ai_response
          });
          break;

        case 'general_response':
        default:
          addMessage({
            role: 'assistant',
            content: data.ai_response || 'Como posso te ajudar?'
          });
      }

    } catch (error: any) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: `❌ Desculpe, ocorreu um erro. ${error.message || 'Tente novamente.'}`,
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransaction = async (transaction: PendingTransaction) => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (transaction.type === 'transfer') {
        // Handle transfer
        const { data, error } = await supabase.functions.invoke('financial-assistant', {
          body: {
            action: 'confirm_transaction',
            userId: user.id,
            transactionData: {
              type: 'expense',
              amount: transaction.amount,
              category: 'Transferência',
              description: transaction.description,
              account_id: transaction.account_id,
              date: transaction.date,
              transfer_to_account_id: transaction.transfer_to_account_id
            }
          }
        });

        if (error) throw error;
        
        // Also create income in destination
        await supabase.functions.invoke('financial-assistant', {
          body: {
            action: 'confirm_transaction',
            userId: user.id,
            transactionData: {
              type: 'income',
              amount: transaction.amount,
              category: 'Transferência',
              description: `Recebido de ${transaction.account_name}`,
              account_id: transaction.transfer_to_account_id,
              date: transaction.date
            }
          }
        });
      } else {
        // Regular transaction
        const { data, error } = await supabase.functions.invoke('financial-assistant', {
          body: {
            action: 'confirm_transaction',
            userId: user.id,
            transactionData: {
              type: transaction.type,
              amount: transaction.amount,
              category: transaction.category,
              description: transaction.description,
              account_id: transaction.account_id,
              date: transaction.date,
              installments: transaction.installments || 1
            }
          }
        });

        if (error) throw error;
      }

      // Award XP
      try {
        await incrementTransactionCount.mutateAsync();
      } catch {
        // XP update silently skipped
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank_accounts'] });

      const installmentText = transaction.installments && transaction.installments > 1
        ? ` em ${transaction.installments}x`
        : '';

      addMessage({
        role: 'assistant',
        content: `✅ **Transação confirmada!**${installmentText}\n\n+${XP_REWARDS.TRANSACTION} XP ganhos! 🎮`,
        status: 'confirmed'
      });

      setPendingTransaction(null);
      toast.success('Transação salva com sucesso!');

    } catch (error: any) {
      console.error('Confirm error:', error);
      addMessage({
        role: 'assistant',
        content: `❌ Erro ao salvar: ${error.message}`,
        status: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTransaction = () => {
    setPendingTransaction(null);
    addMessage({
      role: 'assistant',
      content: '🚫 Transação cancelada. Como mais posso ajudar?',
      status: 'cancelled'
    });
  };

  const handleEditTransaction = (edited: PendingTransaction) => {
    setPendingTransaction(edited);
    addMessage({
      role: 'assistant',
      content: '✏️ Transação atualizada. Confirme os novos dados.',
    });
  };

  const clearHistory = () => {
    setMessages([WELCOME_MESSAGE]);
    setConversationHistory([]);
    setPendingTransaction(null);
    toast.success('Histórico limpo!');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col shadow-xl border-0 bg-gradient-to-b from-card to-card/95">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <span className="text-lg font-semibold">Assistente Financeiro</span>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-normal">Fin • Seu parceiro financeiro</p>
              </div>
            </div>
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={clearHistory}
              title="Limpar histórico"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            
            {/* Pending transaction preview */}
            {pendingTransaction && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <TransactionPreview
                  transaction={pendingTransaction}
                  accounts={accounts}
                  categories={{ income: incomeCategories, expense: expenseCategories }}
                  onConfirm={handleConfirmTransaction}
                  onCancel={handleCancelTransaction}
                  onEdit={handleEditTransaction}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !pendingTransaction && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 bg-muted/80 rounded-2xl rounded-bl-md px-4 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Pensando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick actions */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          <QuickActions onAction={(prompt) => sendMessage(prompt)} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua transação ou pergunta..."
              disabled={isLoading}
              className="min-h-[44px] max-h-32 resize-none rounded-xl"
              rows={1}
            />
            <Button 
              onClick={() => sendMessage()} 
              disabled={isLoading || !input.trim()}
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            <Sparkles className="w-3 h-3 inline mr-1" />
            Dica: Use linguagem natural como "gastei 50 no mercado ontem"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
