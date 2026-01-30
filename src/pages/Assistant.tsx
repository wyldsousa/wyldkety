import { FinancialAssistantChat } from '@/components/FinancialAssistant';

export default function Assistant() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assistente Financeiro</h1>
        <p className="text-muted-foreground">Converse com a IA para gerenciar suas finanças</p>
      </div>
      
      <FinancialAssistantChat />
    </div>
  );
}
