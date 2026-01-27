import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, PlayCircle, ArrowDownToLine, Clock, CheckCircle, XCircle, Gift, History } from 'lucide-react';
import { useVirtualWallet } from '@/hooks/useVirtualWallet';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

const AD_TYPES = [
  { id: 'rewarded_video', name: 'Vídeo Recompensado', reward: 0.05, duration: '30s' },
  { id: 'interstitial', name: 'Anúncio Intersticial', reward: 0.02, duration: '15s' },
];

const PIX_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'random', label: 'Chave Aleatória' },
];

export default function Earnings() {
  const { wallet, adHistory, withdrawals, isLoading, recordAdWatch, requestWithdrawal } = useVirtualWallet();
  const [isWatching, setIsWatching] = useState(false);
  const [currentAd, setCurrentAd] = useState<typeof AD_TYPES[0] | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const handleWatchAd = async (adType: typeof AD_TYPES[0]) => {
    setCurrentAd(adType);
    setIsWatching(true);
    
    // Simulate ad watching (in production, this would integrate with AdMob)
    toast.info(`Assistindo ${adType.name}...`, { duration: 3000 });
    
    setTimeout(() => {
      recordAdWatch.mutate({
        adType: adType.id,
        rewardAmount: adType.reward,
      });
      setIsWatching(false);
      setCurrentAd(null);
    }, 3000);
  };

  const handleWithdraw = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    requestWithdrawal.mutate({
      amount: Number(formData.get('amount')),
      pixKey: formData.get('pixKey') as string,
      pixType: formData.get('pixType') as string,
    });
    
    setWithdrawOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-blue-500"><CheckCircle className="w-3 h-3" /> Aprovado</Badge>;
      case 'completed':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="w-3 h-3" /> Concluído</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ganhe Dinheiro</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Ganhe Dinheiro</h1>
        <p className="text-muted-foreground">Assista anúncios e ganhe recompensas</p>
      </div>

      {/* Wallet Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-soft border-0 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet?.balance || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-soft border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Gift className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Ganho</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet?.total_earned || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-soft border-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ArrowDownToLine className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sacado</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(wallet?.total_withdrawn || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earn" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="earn">Ganhar</TabsTrigger>
          <TabsTrigger value="withdraw">Sacar</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="earn" className="space-y-4">
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" />
                Anúncios Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {AD_TYPES.map((adType) => (
                <div key={adType.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div>
                    <h3 className="font-semibold">{adType.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Duração: {adType.duration} • Recompensa: {formatCurrency(adType.reward)}
                    </p>
                  </div>
                  <Button 
                    onClick={() => handleWatchAd(adType)}
                    disabled={isWatching}
                    className="gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {isWatching && currentAd?.id === adType.id ? 'Assistindo...' : 'Assistir'}
                  </Button>
                </div>
              ))}
              
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Nota:</strong> Para integrar anúncios reais do Google AdMob, você precisará configurar 
                  sua conta AdMob e adicionar o SDK ao aplicativo nativo (APK).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-4">
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-primary" />
                Solicitar Saque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (mínimo R$ 10,00)</Label>
                  <Input 
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="10"
                    max={wallet?.balance || 0}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pixType">Tipo de Chave PIX</Label>
                  <Select name="pixType" defaultValue="cpf">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIX_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave PIX</Label>
                  <Input 
                    id="pixKey"
                    name="pixKey"
                    placeholder="Digite sua chave PIX"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full gap-2"
                  disabled={requestWithdrawal.isPending || (wallet?.balance || 0) < 10}
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  Solicitar Saque
                </Button>
              </form>
              
              {(wallet?.balance || 0) < 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Você precisa de pelo menos R$ 10,00 para solicitar um saque.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="w-5 h-5" />
                Solicitações de Saque
              </CardTitle>
            </CardHeader>
            <CardContent>
              {withdrawals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma solicitação de saque ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{formatCurrency(withdrawal.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(withdrawal.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {getStatusBadge(withdrawal.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Histórico de Anúncios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {adHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum anúncio assistido ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {adHistory.map((ad) => (
                    <div key={ad.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">
                          {AD_TYPES.find(t => t.id === ad.ad_type)?.name || ad.ad_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ad.watched_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        +{formatCurrency(ad.reward_amount)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
