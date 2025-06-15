
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useHeadAdmin = () => {
  return useQuery({
    queryKey: ['headAdmin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('badge', 'head_admin')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') { // Ignore no rows found error
        console.error("Error fetching head admin:", error);
        throw new Error(error.message);
      }
      return data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    gcTime: 1000 * 60 * 60,
  });
};
