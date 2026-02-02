import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useReminders } from '@/hooks/useReminders';
import { useCreditCards } from '@/hooks/useCreditCards';
import { useAuth } from '@/hooks/useAuth';
import { useUserProgress, XP_REWARDS } from '@/hooks/useUserProgress';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'error';
}

export interface PendingTransaction {
  type: 'income' | 'expense' | 'transfer' | 'credit_card';
  amount: number;
  category?: string;
  description: string;
  account_id?: string;
  account_name?: string;
  transfer_to_account_id?: string;
  transfer_to_account_name?: string;
  card_id?: string;
  card_name?: string;
  date: string;
  installments?: number;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
}

interface AssistantChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  pendingTransaction: PendingTransaction | null;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  sendMessage: (text: string) => Promise<void>;
  confirmTransaction: (transaction: PendingTransaction) => Promise<void>;
  cancelTransaction: () => void;
  editTransaction: (edited: PendingTransaction) => void;
  clearHistory: () => void;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `Olá! 👋 Sou o **Fin**, seu assistente financeiro pessoal.

Posso te ajudar a:
- 💰 **Registrar transações** em linguagem natural
- 💳 **Gerenciar cartões de crédito** e faturas
- 📊 **Consultar seus gastos** e receitas
- ⏰ **Criar e gerenciar lembretes**
- 🏷️ **Criar e editar categorias**
- 💡 **Dar insights** sobre suas finanças

**Exemplos do que você pode me dizer:**
- "Gastei 50 reais no mercado"
- "Comprei um celular de 2000 em 10x no crédito"
- "Quanto gastei este mês?"
- "Criar lembrete para pagar aluguel dia 10"
- "Criar categoria Academia"

Como posso te ajudar? 😊`,
  timestamp: new Date(),
};

const AssistantChatContext = createContext<AssistantChatContextType | undefined>(undefined);

export function AssistantChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { accounts } = useBankAccounts();
  const { incomeCategories, expenseCategories, createCategory } = useCategories();
  const { createReminder } = useReminders();
  const { cards } = useCreditCards();
  const { incrementTransactionCount } = useUserProgress();

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    addMessage({ role: 'user', content: text });
    setIsLoading(true);

    const newHistory = [...conversationHistory, { role: 'user', content: text }];
    setConversationHistory(newHistory);

    try {
      if (accounts.length === 0 && cards.length === 0) {
        addMessage({
          role: 'assistant',
          content: '⚠️ Você precisa criar pelo menos uma conta bancária ou cartão de crédito antes de registrar transações.',
          status: 'error'
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('financial-assistant', {
        body: {
          message: text,
          accounts: accounts.map(a => ({ id: a.id, name: a.name, bank_name: a.bank_name })),
          cards: cards.map(c => ({ id: c.id, name: c.name, bank_name: c.bank_name })),
          categories: {
            income: incomeCategories,
            expense: expenseCategories
          },
          userId: user?.id,
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
            account_id: data.data.account_id || accounts[0]?.id,
            account_name: accountName,
            date: data.data.date,
            installments: data.data.installments || 1,
            recurrence: data.data.recurrence || 'none'
          };
          
          addMessage({
            role: 'assistant',
            content: data.ai_response || 'Entendi! Confirme os dados:',
            status: 'pending'
          });
          
          setPendingTransaction(transaction);
          break;

        case 'create_credit_card_transaction':
          const cardName = cards.find(c => c.id === data.data.card_id)?.name || 'Cartão';
          const ccTransaction: PendingTransaction = {
            type: 'credit_card',
            amount: data.data.amount,
            category: data.data.category,
            description: data.data.description,
            card_id: data.data.card_id || cards[0]?.id,
            card_name: cardName,
            date: data.data.date,
            installments: data.data.installments || 1
          };
          
          addMessage({
            role: 'assistant',
            content: data.ai_response || 'Compra no crédito detectada! Confirme:',
            status: 'pending'
          });
          
          setPendingTransaction(ccTransaction);
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
            content: data.ai_response || 'Entendi a transferência. Confirme:',
            status: 'pending'
          });
          
          setPendingTransaction(transfer);
          break;

        case 'create_category':
          try {
            await createCategory.mutateAsync({
              name: data.data.name,
              type: data.data.type,
              color: data.data.color || '#10B981',
              icon: 'tag'
            });
            addMessage({
              role: 'assistant',
              content: `✅ **Categoria "${data.data.name}" criada!**\n\n+${XP_REWARDS.TRANSACTION} XP ganhos! 🎮`
            });
          } catch (e) {
            addMessage({
              role: 'assistant',
              content: `❌ Erro ao criar categoria.`,
              status: 'error'
            });
          }
          break;

        case 'create_reminder':
          try {
            await createReminder.mutateAsync({
              title: data.data.title,
              description: data.data.description || null,
              amount: data.data.amount || null,
              due_date: data.data.due_date || null,
              is_completed: false,
              is_recurring: data.data.is_recurring || false,
              recurrence_type: data.data.recurrence_type || 'none',
              recurrence_day: data.data.due_date ? new Date(data.data.due_date).getDate() : null,
              parent_reminder_id: null
            });
            addMessage({
              role: 'assistant',
              content: `✅ **Lembrete "${data.data.title}" criado!**\n\n+${XP_REWARDS.TRANSACTION} XP ganhos! 🎮`
            });
          } catch (e) {
            addMessage({
              role: 'assistant',
              content: `❌ Erro ao criar lembrete.`,
              status: 'error'
            });
          }
          break;

        case 'pay_invoice':
        case 'prepay_installments':
          // These actions need confirmation - show message and let user handle in UI
          addMessage({
            role: 'assistant',
            content: data.ai_response || 'Para pagar faturas ou antecipar parcelas, acesse a aba de Cartões de Crédito e use os botões disponíveis. Posso te ajudar com mais alguma coisa?'
          });
          break;

        case 'query_finances':
        case 'query_response':
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
  }, [isLoading, accounts, cards, incomeCategories, expenseCategories, user, conversationHistory, addMessage, createCategory, createReminder]);

  const confirmTransaction = useCallback(async (transaction: PendingTransaction) => {
    if (!user) return;
    setIsLoading(true);

    try {
      if (transaction.type === 'credit_card') {
        // Handle credit card transaction
        const { error } = await supabase.functions.invoke('financial-assistant', {
          body: {
            action: 'confirm_credit_card_transaction',
            userId: user.id,
            transactionData: {
              card_id: transaction.card_id,
              amount: transaction.amount,
              category: transaction.category,
              description: transaction.description,
              date: transaction.date,
              installments: transaction.installments || 1
            }
          }
        });

        if (error) throw error;
      } else if (transaction.type === 'transfer') {
        // Handle transfer
        const { error } = await supabase.functions.invoke('financial-assistant', {
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
        const { error } = await supabase.functions.invoke('financial-assistant', {
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
      queryClient.invalidateQueries({ queryKey: ['credit_cards'] });
      queryClient.invalidateQueries({ queryKey: ['credit_card_invoices'] });

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
  }, [user, queryClient, incrementTransactionCount, addMessage]);

  const cancelTransaction = useCallback(() => {
    setPendingTransaction(null);
    addMessage({
      role: 'assistant',
      content: '🚫 Transação cancelada. Como mais posso ajudar?',
      status: 'cancelled'
    });
  }, [addMessage]);

  const editTransaction = useCallback((edited: PendingTransaction) => {
    setPendingTransaction(edited);
    addMessage({
      role: 'assistant',
      content: '✏️ Transação atualizada. Confirme os novos dados.',
    });
  }, [addMessage]);

  const clearHistory = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
    setConversationHistory([]);
    setPendingTransaction(null);
    toast.success('Histórico limpo!');
  }, []);

  return (
    <AssistantChatContext.Provider value={{
      messages,
      isLoading,
      pendingTransaction,
      isOpen,
      setIsOpen,
      sendMessage,
      confirmTransaction,
      cancelTransaction,
      editTransaction,
      clearHistory
    }}>
      {children}
    </AssistantChatContext.Provider>
  );
}

export function useAssistantChat() {
  const context = useContext(AssistantChatContext);
  if (!context) {
    throw new Error('useAssistantChat must be used within an AssistantChatProvider');
  }
  return context;
}
