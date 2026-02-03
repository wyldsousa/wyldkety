import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Lock, 
  Crown, 
  Play, 
  Clock, 
  Sparkles, 
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

interface AccessGateProps {
  children: React.ReactNode;
}

export function AccessGate({ children }: AccessGateProps) {
  const { 
    subscription,
    isLoading,
    hasValidAccess,
    isPremiumActive,
    getAdAccessRemaining,
    getPremiumDaysRemaining,
    grantAdAccess,
    activatePremium
  } = useSubscription();

  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);

  // Update remaining time every second
  useEffect(() => {
    const updateRemaining = () => {
      setRemainingTime(getAdAccessRemaining());
    };
    
    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    
    return () => clearInterval(interval);
  }, [subscription, getAdAccessRemaining]);

  const formatTime = (ms: number): string => {
    if (ms <= 0) return '0:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleWatchAd = async () => {
    // TODO: Integrate with AdMob for real ad viewing
    // Currently disabled - requires ad integration
    toast.info('Integração com anúncios em desenvolvimento. Por favor, adquira o Premium.');
    return;
  };

  const handleActivatePremium = async () => {
    // TODO: Integrate with payment gateway (Stripe, etc.)
    // Currently disabled - requires payment integration
    toast.info('Integração de pagamento em desenvolvimento. Entre em contato para ativar o Premium.');
    return;
  };

  if (isLoading) {
    return (
      <Card className="h-[calc(100vh-12rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  // Show access status bar if user has access
  if (hasValidAccess()) {
    return (
      <div className="space-y-2">
        {/* Access Status Banner */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg">
          {isPremiumActive() ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
              <span className="text-sm text-muted-foreground">
                {getPremiumDaysRemaining()} dias restantes
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Clock className="w-3 h-3 mr-1" />
                Acesso Temporário
              </Badge>
              <span className="text-sm font-medium text-primary">
                {formatTime(remainingTime)} restantes
              </span>
            </div>
          )}
          
          {!isPremiumActive() && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleActivatePremium}
              disabled={activatePremium.isPending}
              className="text-xs"
            >
              <Crown className="w-3 h-3 mr-1" />
              Ativar Premium
            </Button>
          )}
        </div>
        
        {/* Actual content */}
        {children}
      </div>
    );
  }

  // Show access gate if user doesn't have access
  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col items-center justify-center shadow-xl border-0 bg-gradient-to-b from-card to-card/95">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Assistente Financeiro IA</CardTitle>
        <CardDescription className="text-base mt-2">
          Acesse seu assistente financeiro pessoal
        </CardDescription>
      </CardHeader>

      <CardContent className="w-full max-w-sm space-y-6 pt-4">
        {/* Premium Option */}
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-500" />
                  <span className="font-semibold">Premium VIP</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Acesso ilimitado por 30 dias
                </p>
              </div>
              <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                R$ 10,00
              </Badge>
            </div>
            
            <ul className="space-y-2 mb-4">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Acesso ilimitado ao chat IA
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Sem anúncios por 30 dias
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Suporte prioritário
              </li>
            </ul>
            
            <Button 
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white"
              onClick={handleActivatePremium}
              disabled={activatePremium.isPending}
            >
              {activatePremium.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Crown className="w-4 h-4 mr-2" />
              )}
              Ativar Premium
            </Button>
          </CardContent>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        {/* Ad-based Option */}
        <Card className="border border-border/50">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-500" />
                  <span className="font-semibold">Acesso Gratuito</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Assista um anúncio para liberar
                </p>
              </div>
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                1 hora
              </Badge>
            </div>

            {isWatchingAd ? (
              <div className="space-y-3">
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Carregando anúncio...</p>
                </div>
                <Progress value={33} className="h-2" />
              </div>
            ) : (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleWatchAd}
                disabled={grantAdAccess.isPending}
              >
                {grantAdAccess.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Assistir Anúncio
              </Button>
            )}
          </CardContent>
        </Card>
      </CardContent>

      <CardFooter className="text-center">
        <p className="text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3 inline mr-1" />
          O assistente ajuda a gerenciar suas finanças por linguagem natural
        </p>
      </CardFooter>
    </Card>
  );
}
