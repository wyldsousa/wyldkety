import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  User, Mail, Phone, Save, Camera, Loader2, 
  CheckCircle2, XCircle, Send, Users, UserPlus, 
  Crown, Shield, Trash2, Settings, Plus
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFinancialGroups, useGroupMembers } from '@/hooks/useFinancialGroups';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { GroupPermissions, DEFAULT_MEMBER_PERMISSIONS, FULL_PERMISSIONS } from '@/types/groups';

export default function Profile() {
  const { user } = useAuth();
  const { profile, isLoading, updateProfile } = useProfile();
  const { 
    groups, 
    pendingInvites, 
    memberships,
    createGroup, 
    inviteUser, 
    acceptInvite, 
    rejectInvite,
    removeMember,
    updateMemberPermissions,
    isGroupAdmin 
  } = useFinancialGroups();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermissions, setInvitePermissions] = useState<GroupPermissions>(DEFAULT_MEMBER_PERMISSIONS);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get members for selected group
  const { data: groupMembers } = useGroupMembers(selectedGroupId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    await updateProfile.mutateAsync({
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string || null,
    });
    
    setIsEditing(false);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB');
      return;
    }

    setIsUploading(true);

    try {
      const resizedFile = await resizeImage(file, 512);
      const fileExt = 'webp';
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, resizedFile, { 
          upsert: true,
          contentType: 'image/webp'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile.mutateAsync({
        avatar_url: publicUrl + '?t=' + Date.now(),
      });

      toast.success('Foto atualizada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao atualizar foto: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resizeImage = (file: File, maxSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          'image/webp',
          0.92
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleSendVerificationEmail = async () => {
    if (!user?.email) return;
    
    setIsVerifyingEmail(true);
    try {
      // For now, since we don't have a proper email service set up,
      // we'll just show a message explaining the verification
      toast.info('Para verificar seu email, faça logout e login novamente. Um link de verificação será enviado.');
    } catch (error: any) {
      toast.error('Erro ao enviar verificação: ' + error.message);
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Digite um nome para o grupo');
      return;
    }

    await createGroup.mutateAsync({ name: newGroupName.trim() });
    setNewGroupName('');
    setShowCreateGroup(false);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !selectedGroupId) {
      toast.error('Digite o email do convidado');
      return;
    }

    await inviteUser.mutateAsync({
      groupId: selectedGroupId,
      email: inviteEmail.trim(),
      permissions: invitePermissions,
    });
    setInviteEmail('');
    setShowInvite(false);
    setInvitePermissions(DEFAULT_MEMBER_PERMISSIONS);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
        <p className="text-muted-foreground">Gerencie suas informações e grupo financeiro</p>
      </div>

      {/* Pending Invites */}
      {pendingInvites && pendingInvites.length > 0 && (
        <Card className="shadow-soft border-0 border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Convites Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Convite para grupo financeiro</p>
                  <p className="text-sm text-muted-foreground">
                    Expira em {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => rejectInvite.mutate(invite.id)}
                  >
                    Recusar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => acceptInvite.mutate(invite)}
                  >
                    Aceitar
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Profile Info */}
      <Card className="shadow-soft border-0">
        <CardContent className="p-6">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <Avatar className="w-24 h-24 mb-2">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            <h2 className="text-xl font-semibold text-foreground mt-2">{profile?.full_name || 'Usuário'}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>

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
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    name="phone" 
                    placeholder="(00) 00000-0000"
                    defaultValue={profile?.phone || ''}
                    className="pl-10"
                  />
                </div>
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

              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Telefone</span>
                  </div>
                  {profile?.phone ? (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      Não verificado
                    </Badge>
                  ) : null}
                </div>
                <p className="text-foreground font-medium ml-7">{profile?.phone || '-'}</p>
              </div>

              <Button onClick={() => setIsEditing(true)} className="w-full">
                Editar Perfil
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Group Section */}
      <Card className="shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Grupo Financeiro
          </CardTitle>
          <CardDescription>
            Gerencie o acesso compartilhado às suas finanças
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups && groups.length > 0 ? (
            <>
              {groups.map((group) => {
                const isAdmin = isGroupAdmin(group.id);
                const membership = memberships?.find(m => m.group_id === group.id);
                
                return (
                  <div key={group.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{group.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {isAdmin ? 'Administrador' : 'Membro'}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedGroupId(group.id);
                            setShowInvite(true);
                          }}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Convidar
                        </Button>
                      )}
                    </div>

                    {/* Show group members when selected */}
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start"
                      onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {selectedGroupId === group.id ? 'Ocultar membros' : 'Ver membros'}
                    </Button>

                    {selectedGroupId === group.id && groupMembers && (
                      <div className="space-y-2 pt-2 border-t">
                        {groupMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-8 h-8">
                                <AvatarImage src={(member as any).profiles?.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {getInitials((member as any).profiles?.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {(member as any).profiles?.full_name || 'Usuário'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member.role === 'admin' ? (
                                    <span className="flex items-center gap-1">
                                      <Crown className="w-3 h-3 text-yellow-500" />
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Shield className="w-3 h-3" />
                                      Membro
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            {isAdmin && member.user_id !== user?.id && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm('Remover este membro do grupo?')) {
                                    removeMember.mutate(member.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">Nenhum grupo financeiro</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie um grupo para compartilhar suas finanças com outras pessoas
              </p>
            </div>
          )}

          <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
            <DialogTrigger asChild>
              <Button className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Criar Grupo Financeiro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Grupo Financeiro</DialogTitle>
                <DialogDescription>
                  Crie um grupo para compartilhar suas finanças com família ou parceiros
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do grupo</Label>
                  <Input 
                    placeholder="Ex: Família Silva" 
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateGroup} disabled={createGroup.isPending}>
                  {createGroup.isPending ? 'Criando...' : 'Criar Grupo'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Invite Dialog */}
          <Dialog open={showInvite} onOpenChange={setShowInvite}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Convidar para o Grupo</DialogTitle>
                <DialogDescription>
                  Envie um convite para adicionar uma pessoa ao seu grupo financeiro
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Email do convidado</Label>
                  <Input 
                    type="email"
                    placeholder="email@exemplo.com" 
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <Label>Permissões</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Gerenciar contas</p>
                      <p className="text-xs text-muted-foreground">Criar, editar e excluir contas bancárias</p>
                    </div>
                    <Switch 
                      checked={invitePermissions.can_manage_accounts}
                      onCheckedChange={(checked) => setInvitePermissions(prev => ({
                        ...prev,
                        can_manage_accounts: checked
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Gerenciar transações</p>
                      <p className="text-xs text-muted-foreground">Criar, editar e excluir transações</p>
                    </div>
                    <Switch 
                      checked={invitePermissions.can_manage_transactions}
                      onCheckedChange={(checked) => setInvitePermissions(prev => ({
                        ...prev,
                        can_manage_transactions: checked
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Gerenciar cartões</p>
                      <p className="text-xs text-muted-foreground">Criar, editar e excluir cartões de crédito</p>
                    </div>
                    <Switch 
                      checked={invitePermissions.can_manage_cards}
                      onCheckedChange={(checked) => setInvitePermissions(prev => ({
                        ...prev,
                        can_manage_cards: checked
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Gerenciar lembretes</p>
                      <p className="text-xs text-muted-foreground">Criar, editar e excluir lembretes</p>
                    </div>
                    <Switch 
                      checked={invitePermissions.can_manage_reminders}
                      onCheckedChange={(checked) => setInvitePermissions(prev => ({
                        ...prev,
                        can_manage_reminders: checked
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Gerenciar categorias</p>
                      <p className="text-xs text-muted-foreground">Criar e editar categorias</p>
                    </div>
                    <Switch 
                      checked={invitePermissions.can_manage_categories}
                      onCheckedChange={(checked) => setInvitePermissions(prev => ({
                        ...prev,
                        can_manage_categories: checked
                      }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Ver relatórios</p>
                      <p className="text-xs text-muted-foreground">Visualizar relatórios financeiros</p>
                    </div>
                    <Switch 
                      checked={invitePermissions.can_view_reports}
                      onCheckedChange={(checked) => setInvitePermissions(prev => ({
                        ...prev,
                        can_view_reports: checked
                      }))}
                    />
                  </div>

                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setInvitePermissions(FULL_PERMISSIONS)}
                  >
                    Dar todas as permissões
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInvite(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInviteUser} disabled={inviteUser.isPending}>
                  {inviteUser.isPending ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
