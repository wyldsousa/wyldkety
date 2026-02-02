import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { FinancialGroup, GroupMember, GroupInvite, GroupPermissions, FULL_PERMISSIONS } from '@/types/groups';

export function useFinancialGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch groups the user belongs to
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['financial-groups', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('financial_groups')
        .select('*');
      
      if (error) throw error;
      return data as FinancialGroup[];
    },
    enabled: !!user,
  });

  // Fetch group members
  const { data: memberships, isLoading: membershipsLoading } = useQuery({
    queryKey: ['group-memberships', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as GroupMember[];
    },
    enabled: !!user,
  });

  // Fetch pending invites for current user
  const { data: pendingInvites, isLoading: invitesLoading } = useQuery({
    queryKey: ['pending-invites', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      
      const { data, error } = await supabase
        .from('group_invites')
        .select('*')
        .eq('invited_email', user.email)
        .eq('status', 'pending');
      
      if (error) throw error;
      return data as GroupInvite[];
    },
    enabled: !!user?.email,
  });

  // Create a new group (trigger automatically adds creator as admin)
  const createGroup = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');

      // Create the group - trigger handles adding creator as admin
      const { data: group, error: groupError } = await supabase
        .from('financial_groups')
        .insert({
          name,
          description,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      return group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-memberships'] });
      toast.success('Grupo criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar grupo: ' + error.message);
    },
  });

  // Invite a user to a group
  const inviteUser = useMutation({
    mutationFn: async ({ 
      groupId, 
      email, 
      permissions 
    }: { 
      groupId: string; 
      email: string; 
      permissions: GroupPermissions;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          invited_email: email,
          invited_by: user.id,
          role: 'member',
          ...permissions,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invites'] });
      toast.success('Convite enviado com sucesso!');
    },
    onError: (error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Este email já foi convidado para o grupo');
      } else {
        toast.error('Erro ao enviar convite: ' + error.message);
      }
    },
  });

  // Accept an invite
  const acceptInvite = useMutation({
    mutationFn: async (invite: GroupInvite) => {
      if (!user) throw new Error('Not authenticated');

      // Update invite status
      const { error: updateError } = await supabase
        .from('group_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      // Add user as member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: invite.group_id,
          user_id: user.id,
          role: invite.role,
          can_manage_accounts: invite.can_manage_accounts,
          can_manage_transactions: invite.can_manage_transactions,
          can_manage_cards: invite.can_manage_cards,
          can_manage_reminders: invite.can_manage_reminders,
          can_manage_categories: invite.can_manage_categories,
          can_view_reports: invite.can_view_reports,
        });

      if (memberError) throw memberError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast.success('Você entrou no grupo!');
    },
    onError: (error) => {
      toast.error('Erro ao aceitar convite: ' + error.message);
    },
  });

  // Reject an invite
  const rejectInvite = useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('group_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast.success('Convite recusado');
    },
    onError: (error) => {
      toast.error('Erro ao recusar convite: ' + error.message);
    },
  });

  // Update member permissions
  const updateMemberPermissions = useMutation({
    mutationFn: async ({ 
      memberId, 
      permissions 
    }: { 
      memberId: string; 
      permissions: Partial<GroupPermissions>;
    }) => {
      const { error } = await supabase
        .from('group_members')
        .update(permissions)
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success('Permissões atualizadas!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar permissões: ' + error.message);
    },
  });

  // Remove a member from group
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      queryClient.invalidateQueries({ queryKey: ['financial-groups'] });
      toast.success('Membro removido do grupo');
    },
    onError: (error) => {
      toast.error('Erro ao remover membro: ' + error.message);
    },
  });

  // Update group details (name, description)
  const updateGroup = useMutation({
    mutationFn: async ({ groupId, name, description }: { groupId: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .rpc('update_financial_group', {
          _group_id: groupId,
          _name: name,
          _description: description || null,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-groups'] });
      toast.success('Grupo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar grupo: ' + error.message);
    },
  });

  // Delete a group (admin only)
  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase
        .rpc('delete_financial_group', {
          _group_id: groupId,
        });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['group-members'] });
      toast.success('Grupo excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir grupo: ' + error.message);
    },
  });

  // Get current user's permissions for a specific group
  const getUserPermissions = (groupId: string | null): GroupPermissions | null => {
    if (!groupId || !memberships) return null;
    
    const membership = memberships.find(m => m.group_id === groupId);
    if (!membership) return null;

    // Admins have all permissions
    if (membership.role === 'admin') return FULL_PERMISSIONS;

    return {
      can_manage_accounts: membership.can_manage_accounts,
      can_manage_transactions: membership.can_manage_transactions,
      can_manage_cards: membership.can_manage_cards,
      can_manage_reminders: membership.can_manage_reminders,
      can_manage_categories: membership.can_manage_categories,
      can_view_reports: membership.can_view_reports,
    };
  };

  // Check if user is admin of a group
  const isGroupAdmin = (groupId: string | null): boolean => {
    if (!groupId || !memberships) return false;
    const membership = memberships.find(m => m.group_id === groupId);
    return membership?.role === 'admin';
  };

  return {
    groups,
    memberships,
    pendingInvites,
    isLoading: groupsLoading || membershipsLoading || invitesLoading,
    createGroup,
    updateGroup,
    deleteGroup,
    inviteUser,
    acceptInvite,
    rejectInvite,
    updateMemberPermissions,
    removeMember,
    getUserPermissions,
    isGroupAdmin,
  };
}

// Separate hook for fetching group members
export function useGroupMembers(groupId: string | null) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('group_id', groupId);
      
      if (error) throw error;
      return data as GroupMember[];
    },
    enabled: !!groupId,
  });
}
