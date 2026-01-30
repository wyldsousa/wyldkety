import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Minus, 
  ArrowLeftRight, 
  PieChart, 
  TrendingUp, 
  Calendar,
  Lightbulb
} from 'lucide-react';

interface QuickActionsProps {
  onAction: (prompt: string) => void;
}

export function QuickActions({ onAction }: QuickActionsProps) {
  const actions = [
    { icon: Plus, label: 'Receita', prompt: 'Quero adicionar uma receita', color: 'text-income' },
    { icon: Minus, label: 'Despesa', prompt: 'Quero adicionar uma despesa', color: 'text-expense' },
    { icon: ArrowLeftRight, label: 'Transferir', prompt: 'Quero fazer uma transferência', color: 'text-primary' },
    { icon: PieChart, label: 'Resumo', prompt: 'Quanto gastei este mês?', color: 'text-muted-foreground' },
    { icon: TrendingUp, label: 'Sobrou', prompt: 'Quanto me sobrou este mês?', color: 'text-income' },
    { icon: Calendar, label: 'Semana', prompt: 'Resumo da semana', color: 'text-muted-foreground' },
    { icon: Lightbulb, label: 'Dicas', prompt: 'Me dê dicas para economizar', color: 'text-warning' },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={() => onAction(action.prompt)}
          className="flex-shrink-0 gap-1.5 rounded-full hover:bg-muted/80 transition-colors"
        >
          <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
          <span className="text-xs">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
