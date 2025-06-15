
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useToast } from '@/components/ui/use-toast';

export const useGlobalMessages = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (payload: any) => {
      console.log('Global message handler triggered:', payload);
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['unreadCounts', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });

      const newMessage = payload.new as { recipient_id: string; sender_id: string };

      // Handle archived conversations
      supabase
        .from('archived_conversations')
        .select('archived_user_id')
        .eq('user_id', user.id)
        .eq('archived_user_id', newMessage.sender_id)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error checking for archived conversation:', error);
            return;
          }

          if (data && data.length > 0) {
            supabase
              .from('archived_conversations')
              .delete()
              .match({ user_id: user.id, archived_user_id: newMessage.sender_id })
              .then(({ error: deleteError }) => {
                if (!deleteError) {
                  toast({
                    title: "Message from archived chat",
                    description: "The conversation has been moved to your inbox.",
                  });
                  queryClient.invalidateQueries({ queryKey: ['archivedConversations', user.id] });
                }
              });
          }
        });
    };

    const channel = supabase
      .channel(`global-messages-listener-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${user.id}` },
        handleNewMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);
};
