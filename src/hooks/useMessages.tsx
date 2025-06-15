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

    const handleNewMessage = (payload: any) => {
        const newMessage = payload.new as Message;
        if (
            ((newMessage.sender_id === senderId && newMessage.recipient_id === recipientId) ||
            (newMessage.sender_id === recipientId && newMessage.recipient_id === senderId)) &&
            !messages.some(m => m.id === newMessage.id)
        ) {
            setMessages(prev => [...prev, newMessage]);
        }
    };

    const channel = supabase
        .channel(`realtime-messages-${senderId}-${recipientId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'messages' },
            handleNewMessage
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [senderId, recipientId, messages]);

  return { messages, isLoading, setMessages };
};
