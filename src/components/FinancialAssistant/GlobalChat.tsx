import { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useAssistantChat, PendingTransaction } from '@/contexts/AssistantChatContext';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCreditCards } from '@/hooks/useCreditCards';
import { ChatMessageComponent } from './ChatMessage';
import { TransactionPreview } from './TransactionPreview';
import { QuickActions } from './QuickActions';

export function GlobalChat() {
  const {
    messages,
    isLoading,
    pendingTransaction,
    sendMessage,
    confirmTransaction,
    cancelTransaction,
    editTransaction,
    clearHistory
  } = useAssistantChat();
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { accounts } = useBankAccounts();
  const { incomeCategories, expenseCategories } = useCategories();
  const { cards } = useCreditCards();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingTransaction]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
              <p className="text-xs text-muted-foreground font-normal">Fin • Seu parceiro financeiro</p>
            </div>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={clearHistory}
            title="Limpar histórico"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessageComponent key={msg.id} message={msg} />
            ))}
            
            {pendingTransaction && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <TransactionPreview
                  transaction={pendingTransaction}
                  accounts={accounts}
                  cards={cards}
                  categories={{ income: incomeCategories, expense: expenseCategories }}
                  onConfirm={confirmTransaction}
                  onCancel={cancelTransaction}
                  onEdit={editTransaction}
                  isLoading={isLoading}
                />
              </div>
            )}

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

        <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
          <QuickActions onAction={(prompt) => sendMessage(prompt)} />
        </div>

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
              onClick={handleSend} 
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
