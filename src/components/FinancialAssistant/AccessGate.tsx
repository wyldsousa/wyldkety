import { ReactNode, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, BotOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AccessGateProps {
  children: ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const [aiEnabled, setAiEnabled] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAiStatus = () => {
      const saved = localStorage.getItem('ai_assistant_enabled');
      setAiEnabled(saved !== null ? JSON.parse(saved) : true);
    };

    checkAiStatus();
    // Listen for storage changes (when user toggles in preferences)
    window.addEventListener('storage', checkAiStatus);
    // Also poll for same-tab changes
    const interval = setInterval(checkAiStatus, 1000);
    return () => {
      window.removeEventListener('storage', checkAiStatus);
      clearInterval(interval);
    };
  }, []);

  if (!aiEnabled) {
    return (
      <Card className="h-[calc(100vh-14rem)] flex flex-col items-center justify-center shadow-xl border-0">
        <CardContent className="text-center space-y-4 p-8">
          <div className="p-4 rounded-full bg-muted inline-block">
            <BotOff className="w-12 h-12 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Assistente IA Desativado</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            O assistente financeiro está desativado nas configurações. 
            Ative-o na aba Perfil → Preferências para usar o Fin.
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/profile')}
            className="gap-2"
          >
            <Bot className="w-4 h-4" />
            Ir para Configurações
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
