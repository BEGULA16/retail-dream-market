
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

const fetchUnreadCounts = async (userId: string): Promise<Record<string, number>> => {
    const { data, error } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', userId)
        .eq('is_read', false);

    if (error) {
        console.error('Error fetching unread counts', error);
        throw error;
    }
    
    if (!data) return {};

    const counts = data.reduce((acc, msg) => {
        if (msg.sender_id) {
            acc[msg.sender_id] = (acc[msg.sender_id] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return counts;
};

export const useUnreadCounts = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const queryKey = ['unreadCounts', user?.id];
    const { data: unreadCounts, ...queryResult } = useQuery({
        queryKey,
        queryFn: () => fetchUnreadCounts(user!.id),
        enabled: !!user,
    });

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel(`realtime-unread-counts-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, queryClient, queryKey]);

    const totalUnreadCount = unreadCounts ? Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) : 0;

    return { unreadCounts, totalUnreadCount, ...queryResult };
};
