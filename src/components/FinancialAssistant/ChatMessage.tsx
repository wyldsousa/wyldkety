import { cn } from '@/lib/utils';
import { ChatMessage as ChatMessageType } from './types';
import { Bot, User, CheckCircle, XCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  const statusIcons = {
    pending: <Clock className="w-3 h-3 text-warning" />,
    confirmed: <CheckCircle className="w-3 h-3 text-income" />,
    cancelled: <XCircle className="w-3 h-3 text-muted-foreground" />,
    error: <XCircle className="w-3 h-3 text-destructive" />
  };

  return (
    <div className={cn(
      "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
          <Bot className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
      
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
        isUser 
          ? "bg-primary text-primary-foreground rounded-br-md" 
          : "bg-muted/80 text-foreground rounded-bl-md"
      )}>
        <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              code: ({ children }) => (
                <code className="bg-background/50 px-1 py-0.5 rounded text-xs">{children}</code>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        
        {message.status && message.status !== 'pending' && (
          <div className={cn(
            "flex items-center gap-1 mt-2 pt-2 border-t",
            isUser ? "border-primary-foreground/20" : "border-border"
          )}>
            {statusIcons[message.status]}
            <span className="text-xs opacity-80">
              {message.status === 'confirmed' && 'Transação confirmada'}
              {message.status === 'cancelled' && 'Cancelado'}
              {message.status === 'error' && 'Erro ao processar'}
            </span>
          </div>
        )}
        
        <div className={cn(
          "text-[10px] mt-1 opacity-60",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center shadow-sm">
          <User className="w-4 h-4 text-secondary-foreground" />
        </div>
      )}
    </div>
  );
}
