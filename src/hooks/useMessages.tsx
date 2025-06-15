import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Message {
  id: string;
  created_at: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  image_url: string | null;
  is_read: boolean;
}

const fetchMessages = async (senderId: string, recipientId: string) => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
  return data || [];
};

export const useMessages = (recipientId: string) => {
  const { user } = useAuth();
  const senderId = user?.id;
  const queryClient = useQueryClient();

  const queryKey = ['messages', senderId, recipientId];

  const { data: messages, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchMessages(senderId!, recipientId),
    enabled: !!senderId && !!recipientId,
  });

  useEffect(() => {
    if (!senderId || !recipientId || !messages) return;

    const unreadMessages = messages.filter(
      (msg) => msg.recipient_id === senderId && !msg.is_read
    );

    if (unreadMessages.length > 0) {
      const markMessagesAsRead = async () => {
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('recipient_id', senderId)
          .eq('sender_id', recipientId)
          .eq('is_read', false);

        if (error) {
          console.error('Error marking messages as read:', error);
        } else {
          queryClient.invalidateQueries({ queryKey: ['unreadCounts', senderId] });
        }
      };

      markMessagesAsRead();
    }
  }, [senderId, recipientId, queryClient, messages]);

  useEffect(() => {
    if (!senderId || !recipientId) return;

    const channel = supabase
        .channel(`realtime-messages-${senderId}-${recipientId}`)
        .on(
            'postgres_changes',
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'messages',
                filter: `or(and(sender_id.eq.${senderId},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${senderId}))`
            },
            () => {
                queryClient.invalidateQueries({ queryKey });
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [senderId, recipientId, queryClient, queryKey]);

  return { messages: messages || [], isLoading };
};
