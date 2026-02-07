import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, LogOut, Loader2, Clock } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { useLoginHistory } from '@/hooks/useLoginHistory';

export function SecuritySection() {
  const { user, signOut } = useAuth();
  const { history, loading: historyLoading } = useLoginHistory();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSigningOutAll, setIsSigningOutAll] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso!');
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao atualizar senha: ' + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSignOutAll = async () => {
    setIsSigningOutAll(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      toast.success('Todas as sessões encerradas');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsSigningOutAll(false);
    }
  };

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="w-5 h-5 text-primary" />
          Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">Histórico de acessos</p>
          </div>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {historyLoading ? (
              <div className="p-3 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground text-center">Nenhum acesso registrado</p>
            ) : (
              history.map((record) => {
                const date = new Date(record.logged_in_at);
                const formattedDate = date.toLocaleDateString('pt-BR');
                const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                return (
                  <div key={record.id} className="flex justify-between items-center px-3 py-2">
                    <span className="text-sm text-foreground">{formattedDate}</span>
                    <span className="text-sm text-muted-foreground">{formattedTime}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {showChangePassword ? (
          <div className="space-y-3 p-4 rounded-lg border border-border">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="new_password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && <PasswordStrengthIndicator password={newPassword} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme a nova senha"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowChangePassword(false); setNewPassword(''); setConfirmPassword(''); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleChangePassword} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setShowChangePassword(true)}>
            Alterar Senha
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Encerrar todas as sessões
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar todas as sessões?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja encerrar todas as sessões ativas?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOutAll} disabled={isSigningOutAll} className="bg-destructive text-destructive-foreground">
                {isSigningOutAll ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Encerrar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
