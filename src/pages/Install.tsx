import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Instalar Aplicativo</h1>
        <p className="text-muted-foreground">Tenha acesso rápido no seu celular</p>
      </div>

      <Card className="shadow-soft border-0">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 rounded-2xl gradient-primary mx-auto mb-6 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary-foreground" />
          </div>

          {isInstalled ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-income/10 mx-auto flex items-center justify-center">
                <Check className="w-8 h-8 text-income" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Aplicativo Instalado!</h2>
              <p className="text-muted-foreground">
                O FinanceApp já está instalado no seu dispositivo. Você pode acessá-lo pela tela inicial.
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Instalar no iPhone/iPad</h2>
              <p className="text-muted-foreground mb-6">
                Para instalar o aplicativo no seu dispositivo iOS, siga os passos:
              </p>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
                  <p className="text-foreground">Toque no botão de compartilhar <span className="font-medium">(ícone de quadrado com seta)</span> na barra do Safari</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
                  <p className="text-foreground">Role para baixo e toque em <span className="font-medium">"Adicionar à Tela de Início"</span></p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">3</span>
                  <p className="text-foreground">Confirme tocando em <span className="font-medium">"Adicionar"</span></p>
                </div>
              </div>
            </div>
          ) : deferredPrompt ? (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Pronto para instalar!</h2>
              <p className="text-muted-foreground">
                Instale o FinanceApp no seu dispositivo para ter acesso rápido e usar mesmo offline.
              </p>
              <Button onClick={handleInstall} size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Instalar Agora
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Instalar o Aplicativo</h2>
              <p className="text-muted-foreground mb-6">
                Para instalar, use o menu do navegador:
              </p>
              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
                  <p className="text-foreground">Abra o menu do navegador <span className="font-medium">(3 pontos ou linhas)</span></p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
                  <p className="text-foreground">Procure por <span className="font-medium">"Instalar aplicativo"</span> ou <span className="font-medium">"Adicionar à tela inicial"</span></p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">3</span>
                  <p className="text-foreground">Confirme a instalação</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft border-0">
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Vantagens do aplicativo instalado</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-income" />
              <span className="text-foreground">Acesso rápido pela tela inicial</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-income" />
              <span className="text-foreground">Experiência de app nativo</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-income" />
              <span className="text-foreground">Carregamento mais rápido</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-income" />
              <span className="text-foreground">Funciona sem conexão (modo offline)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
