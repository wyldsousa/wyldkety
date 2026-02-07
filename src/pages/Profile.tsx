import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  User, Mail, Save, Loader2, 
  CheckCircle2, XCircle, Send
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ProfileHeader } from '@/components/Profile/ProfileHeader';
import { SecuritySection } from '@/components/Profile/SecuritySection';
import { PreferencesSection } from '@/components/Profile/PreferencesSection';
import { AccountSection } from '@/components/Profile/AccountSection';
import { SupportSection } from '@/components/Profile/SupportSection';

export default function Profile() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await updateProfile.mutateAsync({
      full_name: formData.get('full_name') as string,
    });
    
    setIsEditing(false);
  };

  const handleAvatarUpdated = async (url: string) => {
    await updateProfile.mutateAsync({ avatar_url: url });
  };

  const handleSendVerificationEmail = async () => {
    if (!user?.email) return;
    
    setIsVerifyingEmail(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      
      if (error) throw error;
      toast.success('Email de verificação enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      if (error.message?.includes('rate')) {
        toast.error('Aguarde alguns minutos antes de solicitar outro email.');
      } else {
        toast.error('Erro ao enviar verificação: ' + error.message);
      }
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const isEmailVerified = user?.email_confirmed_at !== null;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais</p>
      </div>

      {/* Profile Info */}
      <Card className="shadow-soft border-0">
        <CardContent className="p-6">
          <ProfileHeader
            avatarUrl={profile?.avatar_url}
            fullName={profile?.full_name}
            email={user?.email}
            userId={user?.id}
            isEditing={isEditing}
            onAvatarUpdated={handleAvatarUpdated}
          />

          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="full_name" 
                    name="full_name" 
                    placeholder="Seu nome"
                    defaultValue={profile?.full_name || ''}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ''}
                    className="pl-10"
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1 gap-2" disabled={updateProfile.isPending}>
                  <Save className="w-4 h-4" />
                  Salvar
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 mb-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Nome</span>
                </div>
                <p className="text-foreground font-medium ml-7">{profile?.full_name || '-'}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Email</span>
                  </div>
                  {isEmailVerified ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                      <XCircle className="w-3 h-3 mr-1" />
                      Não verificado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-foreground font-medium ml-7">{user?.email || '-'}</p>
                  {!isEmailVerified && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleSendVerificationEmail}
                      disabled={isVerifyingEmail}
                    >
                      {isVerifyingEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Verificar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <Button onClick={() => setIsEditing(true)} className="w-full">
                Editar Perfil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Section */}
      <SecuritySection />

      {/* Preferences Section */}
      <PreferencesSection />

      {/* Account Section */}
      <AccountSection />

      {/* Support & Pix Sections */}
      <SupportSection />
    </div>
  );
}
