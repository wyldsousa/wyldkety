import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Mail, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const PIX_EMAIL = 'wyldsousa292@gmail.com';

export function SupportSection() {
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopy = async (text: string, type: 'pix' | 'email') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'pix') {
        setCopiedPix(true);
        toast.success('Chave Pix copiada!');
        setTimeout(() => setCopiedPix(false), 2000);
      } else {
        setCopiedEmail(true);
        toast.success('E-mail copiado!');
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  return (
    <>
      {/* Pix / Support the app */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="w-5 h-5 text-pink-500" />
            Ajude a manter o app
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Se o app te ajuda no dia a dia, considere apoiar o desenvolvedor com um Pix. Qualquer valor é bem-vindo!
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-mono text-foreground flex-1 truncate">{PIX_EMAIL}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(PIX_EMAIL, 'pix')}
              className="flex-shrink-0 gap-1"
            >
              {copiedPix ? (
                <><Check className="w-3 h-3 text-green-500" /> Copiado</>
              ) : (
                <><Copy className="w-3 h-3" /> Copiar Pix</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Support contact */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Mail className="w-5 h-5 text-primary" />
            Suporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Precisa de ajuda ou quer reportar um problema?
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
            <span className="text-sm font-mono text-foreground flex-1 truncate">{PIX_EMAIL}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(PIX_EMAIL, 'email')}
              className="flex-shrink-0 gap-1"
            >
              {copiedEmail ? (
                <><Check className="w-3 h-3 text-green-500" /> Copiado</>
              ) : (
                <><Copy className="w-3 h-3" /> Copiar e-mail</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
