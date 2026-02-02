import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface UserSubscription {
  id: string;
  user_id: string;
  is_premium: boolean;
  premium_started_at: string | null;
  premium_expires_at: string | null;
  ad_access_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Try to get existing subscription
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      // Create subscription record if it doesn't exist
      if (!data) {
        const { data: newSub, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        return newSub as UserSubscription;
      }
      
      return data as UserSubscription;
    },
    enabled: !!user,
  });

  // Check if user has valid access (premium or ad-based)
  const hasValidAccess = (): boolean => {
    if (!subscription) return false;
    
    const now = new Date();
    
    // Check premium access
    if (subscription.is_premium && subscription.premium_expires_at) {
      const premiumExpires = new Date(subscription.premium_expires_at);
      if (premiumExpires > now) return true;
    }
    
    // Check ad-based access
    if (subscription.ad_access_expires_at) {
      const adExpires = new Date(subscription.ad_access_expires_at);
      if (adExpires > now) return true;
    }
    
    return false;
  };

  // Check if premium is active
  const isPremiumActive = (): boolean => {
    if (!subscription) return false;
    if (!subscription.is_premium || !subscription.premium_expires_at) return false;
    
    const now = new Date();
    const premiumExpires = new Date(subscription.premium_expires_at);
    return premiumExpires > now;
  };

  // Get remaining time for ad-based access
  const getAdAccessRemaining = (): number => {
    if (!subscription?.ad_access_expires_at) return 0;
    
    const now = new Date();
    const adExpires = new Date(subscription.ad_access_expires_at);
    const remaining = adExpires.getTime() - now.getTime();
    
    return Math.max(0, remaining);
  };

  // Get remaining days for premium
  const getPremiumDaysRemaining = (): number => {
    if (!subscription?.premium_expires_at) return 0;
    
    const now = new Date();
    const premiumExpires = new Date(subscription.premium_expires_at);
    const remaining = premiumExpires.getTime() - now.getTime();
    
    return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
  };

  // Grant ad-based access (1 hour)
  const grantAdAccess = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({ ad_access_expires_at: expiresAt.toISOString() })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Acesso liberado por 1 hora!');
    },
    onError: (error) => {
      toast.error('Erro ao liberar acesso: ' + error.message);
    },
  });

  // Activate premium (30 days)
  const activatePremium = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .update({ 
          is_premium: true,
          premium_started_at: now.toISOString(),
          premium_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      toast.success('Premium ativado por 30 dias!');
    },
    onError: (error) => {
      toast.error('Erro ao ativar premium: ' + error.message);
    },
  });

  return {
    subscription,
    isLoading,
    hasValidAccess,
    isPremiumActive,
    getAdAccessRemaining,
    getPremiumDaysRemaining,
    grantAdAccess,
    activatePremium,
  };
}
