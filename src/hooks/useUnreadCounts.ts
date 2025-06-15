import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useEffect, useRef } from 'react';
import { useNotifications } from './useNotifications';

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
    const { permission, sendNotification } = useNotifications();
    const prevTotalUnreadCount = useRef<number>();

    const queryKey = ['unreadCounts', user?.id];
    const { data: unreadCounts, ...queryResult } = useQuery({
        queryKey,
        queryFn: () => fetchUnreadCounts(user!.id),
        enabled: !!user,
    });

    const totalUnreadCount = unreadCounts ? Object.values(unreadCounts).reduce((sum, count) => sum + count, 0) : 0;

    useEffect(() => {
        if (prevTotalUnreadCount.current === undefined) {
            prevTotalUnreadCount.current = totalUnreadCount;
            return;
        }

        if (
          permission === 'granted' &&
          document.visibilityState !== 'visible' &&
          totalUnreadCount > prevTotalUnreadCount.current
        ) {
          const newMessages = totalUnreadCount - prevTotalUnreadCount.current;
          sendNotification('New Message', {
            body: `You have ${newMessages} new message(s).`,
            icon: '/favicon.ico',
          });
        }
        
        prevTotalUnreadCount.current = totalUnreadCount;
      }, [totalUnreadCount, permission, sendNotification]);

    return { unreadCounts, totalUnreadCount, ...queryResult };
};
