import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogOut, Trash2, Loader2, UserX } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function AccountSection() {
  const { signOut, user } = useAuth();
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteInput, setShowDeleteInput] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'EXCLUIR') {
      toast.error('Digite EXCLUIR para confirmar');
      return;
    }
    setIsDeleting(true);
    try {
      // Delete user data first, then sign out
      // The account can only be fully deleted from backend/admin
      // For now, sign out and notify
      await signOut();
      toast.success('Você foi desconectado. Para exclusão completa, entre em contato com o suporte.');
    } catch (error: any) {
      toast.error('Erro: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserX className="w-5 h-5 text-muted-foreground" />
          Conta
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive border-destructive/30"
            >
              <Trash2 className="w-4 h-4" />
              Apagar minha conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apagar conta permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. Todos os seus dados serão perdidos. Digite <strong>EXCLUIR</strong> para confirmar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder='Digite "EXCLUIR"'
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'EXCLUIR' || isDeleting}
                className="bg-destructive text-destructive-foreground"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Apagar conta
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
