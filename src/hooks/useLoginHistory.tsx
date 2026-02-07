import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LoginRecord {
  id: string;
  logged_in_at: string;
}

export function useLoginHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('login_history')
      .select('id, logged_in_at')
      .eq('user_id', user.id)
      .order('logged_in_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setHistory(data);
    }
    setLoading(false);
  };

  const recordLogin = async (userId: string) => {
    await supabase.from('login_history').insert({ user_id: userId });
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  return { history, loading, recordLogin, refetch: fetchHistory };
}
