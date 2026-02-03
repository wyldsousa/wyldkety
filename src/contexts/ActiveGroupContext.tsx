import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { FinancialGroup, GroupMember } from '@/types/groups';

interface ActiveGroupContextType {
  activeGroup: FinancialGroup | null;
  activeGroupId: string | null;
  setActiveGroupId: (groupId: string | null) => void;
  membership: GroupMember | null;
  isGroupAdmin: boolean;
  isLoading: boolean;
  groups: FinancialGroup[];
  memberships: GroupMember[];
}

const ActiveGroupContext = createContext<ActiveGroupContextType | undefined>(undefined);

export function ActiveGroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => {
    // Recover from localStorage
    const stored = localStorage.getItem('activeGroupId');
    return stored || null;
  });
  const [groups, setGroups] = useState<FinancialGroup[]>([]);
  const [memberships, setMemberships] = useState<GroupMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Persist activeGroupId to localStorage
  useEffect(() => {
    if (activeGroupId) {
      localStorage.setItem('activeGroupId', activeGroupId);
    } else {
      localStorage.removeItem('activeGroupId');
    }
  }, [activeGroupId]);

  // Fetch groups and memberships
  useEffect(() => {
    if (!user) {
      setGroups([]);
      setMemberships([]);
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch groups
        const { data: groupsData, error: groupsError } = await supabase
          .from('financial_groups')
          .select('*');
        
        if (groupsError) throw groupsError;
        setGroups(groupsData || []);

        // Fetch memberships
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('group_members')
          .select('*')
          .eq('user_id', user.id);
        
        if (membershipsError) throw membershipsError;
        setMemberships(membershipsData || []);

        // Validate activeGroupId
        if (activeGroupId) {
          const isValidGroup = (membershipsData || []).some(m => m.group_id === activeGroupId);
          if (!isValidGroup) {
            setActiveGroupId(null);
          }
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Real-time subscription for group changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('group-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'financial_groups',
        },
        async () => {
          // Refetch groups
          const { data } = await supabase.from('financial_groups').select('*');
          setGroups(data || []);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members',
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          // Refetch memberships
          const { data } = await supabase
            .from('group_members')
            .select('*')
            .eq('user_id', user.id);
          setMemberships(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const activeGroup = activeGroupId 
    ? groups.find(g => g.id === activeGroupId) || null 
    : null;
  
  const membership = activeGroupId 
    ? memberships.find(m => m.group_id === activeGroupId) || null 
    : null;

  const isGroupAdmin = membership?.role === 'admin';

  return (
    <ActiveGroupContext.Provider
      value={{
        activeGroup,
        activeGroupId,
        setActiveGroupId,
        membership,
        isGroupAdmin,
        isLoading,
        groups,
        memberships,
      }}
    >
      {children}
    </ActiveGroupContext.Provider>
  );
}

export function useActiveGroup() {
  const context = useContext(ActiveGroupContext);
  if (context === undefined) {
    throw new Error('useActiveGroup must be used within an ActiveGroupProvider');
  }
  return context;
}
