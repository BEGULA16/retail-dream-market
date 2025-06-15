import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const { data: initialMessages, isLoading } = useQuery({
    queryKey: ['messages', senderId, recipientId],
    queryFn: () => fetchMessages(senderId!, recipientId),
    enabled: !!senderId && !!recipientId,
  });

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages as Message[]);
    }
  }, [initialMessages]);

  useEffect(() => {
    if (!senderId || !recipientId) return;

    const handlePostgresChanges = (payload: any) => {
        const changedRecord = payload.new as Message;
        
        // Ensure the message belongs to the current conversation
        if (
            !((changedRecord.sender_id === senderId && changedRecord.recipient_id === recipientId) ||
            (changedRecord.sender_id === recipientId && changedRecord.recipient_id === senderId))
        ) {
            return;
        }

        if (payload.eventType === 'INSERT') {
            setMessages(prev => {
                if (prev.some(m => m.id === changedRecord.id)) {
                    return prev;
                }
                return [...prev, changedRecord];
            });
        } else if (payload.eventType === 'UPDATE') {
            setMessages(prev => prev.map(m => m.id === changedRecord.id ? changedRecord : m));
        }
    };

    const channel = supabase
        .channel(`realtime-messages-${senderId}-${recipientId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'messages' },
            handlePostgresChanges
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [senderId, recipientId]);

  return { messages, isLoading, setMessages };
};
