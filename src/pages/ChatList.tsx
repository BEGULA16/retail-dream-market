import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Archive, ArchiveRestore } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Profile } from '@/types';
import Fuse from 'fuse.js';

interface Conversation extends Profile {
  lastMessageTimestamp: string;
}

const fetchConversations = async (userId: string): Promise<Conversation[]> => {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('sender_id, recipient_id, created_at')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching messages for conversations:', error);
        throw error;
    }
    
    if (!messages || messages.length === 0) return [];

    const conversationsMap = new Map<string, string>();
    const partnerIdsSet = new Set<string>();

    for (const msg of messages) {
        const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        if (partnerId !== userId && !conversationsMap.has(partnerId)) {
            conversationsMap.set(partnerId, msg.created_at);
            partnerIdsSet.add(partnerId);
        }
    }
    
    const partnerIds = Array.from(partnerIdsSet);

    if (partnerIds.length === 0) return [];

    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, badge')
        .in('id', partnerIds);
        
    if (profilesError) {
        console.error('Error fetching profiles for conversations:', profilesError);
        throw profilesError;
    }

    if (!profiles) return [];

    const conversations: Conversation[] = profiles.map(p => ({
        ...p,
        lastMessageTimestamp: conversationsMap.get(p.id)!,
    })).sort((a, b) => new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime());
    
    return conversations;
};

const fetchArchivedConversations = async (userId: string) => {
    const { data, error } = await supabase
        .from('archived_conversations')
        .select('archived_user_id')
        .eq('user_id', userId);
    
    if (error) {
        console.error('Error fetching archived conversations', error);
        throw error;
    }

    return data.map(item => item.archived_user_id);
};

const ChatList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
    }
  }, [user, navigate]);

  const { data: conversations, isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations', user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  });

  const { data: archivedIds } = useQuery({
      queryKey: ['archivedConversations', user?.id],
      queryFn: () => fetchArchivedConversations(user!.id),
      enabled: !!user,
  });

  const { unreadCounts } = useUnreadCounts();

  useEffect(() => {
    if (!user) return;

    const handleNewMessage = async (payload: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
      
      const newMessage = payload.new as { recipient_id: string; sender_id: string; };
      const currentArchivedIds: string[] | undefined = queryClient.getQueryData(['archivedConversations', user.id]);
      
      if (newMessage.recipient_id === user.id && currentArchivedIds?.includes(newMessage.sender_id)) {
        const { error } = await supabase
          .from('archived_conversations')
          .delete()
          .match({ user_id: user.id, archived_user_id: newMessage.sender_id });

        if (!error) {
          toast({
            title: "Message from archived chat",
            description: "The conversation has been moved to your inbox.",
          });
          queryClient.invalidateQueries({ queryKey: ['archivedConversations', user.id] });
        }
      }
    };

    const channel = supabase
      .channel(`realtime-chatlist-updates-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})` },
        handleNewMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, toast]);

  const handleArchive = async (profileId: string) => {
      if (!user) return;
      try {
          const { error } = await supabase
              .from('archived_conversations')
              .insert({ user_id: user.id, archived_user_id: profileId });

          if (error) throw error;

          toast({ title: 'Conversation archived.' });
          queryClient.invalidateQueries({ queryKey: ['archivedConversations', user.id] });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error archiving conversation', description: error.message });
      }
  };

  const handleUnarchive = async (profileId: string) => {
      if (!user) return;
      try {
          const { error } = await supabase
              .from('archived_conversations')
              .delete()
              .match({ user_id: user.id, archived_user_id: profileId });

          if (error) throw error;

          toast({ title: 'Conversation unarchived.' });
          queryClient.invalidateQueries({ queryKey: ['archivedConversations', user.id] });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error unarchiving conversation', description: error.message });
      }
  };

  const profilesToFilter = conversations?.filter(conversation => {
    const isArchived = archivedIds?.includes(conversation.id);

    if (showArchived) {
      return isArchived;
    }
    return !isArchived;
  });

  const filteredProfiles = searchTerm.trim()
    ? new Fuse(profilesToFilter || [], {
        keys: ['username'],
        threshold: 0.4,
      }).search(searchTerm).map(result => result.item)
    : profilesToFilter;

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col">
        <div className="mb-8 flex justify-start items-center">
           <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
            </Link>
          </Button>
        </div>
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">{showArchived ? "Archived Chats" : "Find a user to chat with"}</h1>
            <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
                <Archive className="mr-2 h-4 w-4" />
                {showArchived ? "View Active Chats" : "View Archived Chats"}
            </Button>
        </div>
        <div className="mb-4">
          <Input
            placeholder={showArchived ? "Search in archived users..." : "Search for a user by username..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-grow border rounded-lg p-4 overflow-y-auto">
          {isLoading && <p className="text-center text-muted-foreground">Loading users...</p>}
          <div className="space-y-2">
            {filteredProfiles?.map(conversation => (
              <div key={conversation.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted group">
                <Link to={`/chat/${conversation.id}`} className="flex-grow flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={conversation.avatar_url ?? undefined} />
                    <AvatarFallback>{conversation.username?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{conversation.username}</span>
                    {conversation.badge && <Badge variant="secondary">{conversation.badge}</Badge>}
                    {unreadCounts?.[conversation.id] && !showArchived && (
                        <Badge variant="destructive">{unreadCounts[conversation.id]}</Badge>
                    )}
                  </div>
                </Link>
                <div className="flex items-center">
                    {showArchived ? (
                        <Button variant="ghost" size="icon" onClick={() => handleUnarchive(conversation.id)}>
                            <ArchiveRestore className="h-5 w-5" />
                            <span className="sr-only">Unarchive</span>
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleArchive(conversation.id)}>
                            <Archive className="h-5 w-5" />
                            <span className="sr-only">Archive</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/chat/${conversation.id}`}>
                        <MessageSquare className="h-5 w-5" />
                      </Link>
                    </Button>
                </div>
              </div>
            ))}
            {filteredProfiles?.length === 0 && !isLoading && <p className="text-center text-muted-foreground">{showArchived ? "No archived users found." : "No users found."}</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatList;
