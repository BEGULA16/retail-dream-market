import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Archive } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url');

  if (error) {
    console.error('Error fetching profiles:', error);
    throw new Error(error.message);
  }
  return data || [];
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

    const counts = data.reduce((acc, msg) => {
        acc[msg.sender_id] = (acc[msg.sender_id] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return counts;
};

const ChatList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      navigate('/auth', { replace: true });
    }
  }, [user, navigate]);

  const { data: profiles, isLoading } = useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    enabled: !!user,
  });

  const { data: archivedIds } = useQuery({
      queryKey: ['archivedConversations', user?.id],
      queryFn: () => fetchArchivedConversations(user!.id),
      enabled: !!user,
  });

  const { data: unreadCounts } = useQuery({
      queryKey: ['unreadCounts', user?.id],
      queryFn: () => fetchUnreadCounts(user!.id),
      enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const handleNewMessage = async (payload: any) => {
      const newMessage = payload.new as { recipient_id: string; sender_id: string; };
      
      if (newMessage.recipient_id === user.id) {
        if (archivedIds?.includes(newMessage.sender_id)) {
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
        queryClient.invalidateQueries({ queryKey: ['unreadCounts', user.id] });
      }
    };

    const channel = supabase
      .channel('realtime-chatlist')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, archivedIds, queryClient, toast]);

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

  const filteredProfiles = profiles?.filter(profile =>
    profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) && 
    profile.id !== user?.id &&
    !archivedIds?.includes(profile.id)
  );

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
        <h1 className="text-3xl font-bold mb-4">Find a user to chat with</h1>
        <div className="mb-4">
          <Input
            placeholder="Search for a user by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex-grow border rounded-lg p-4 overflow-y-auto">
          {isLoading && <p className="text-center text-muted-foreground">Loading users...</p>}
          <div className="space-y-2">
            {filteredProfiles?.map(profile => (
              <div key={profile.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted group">
                <Link to={`/chat/${profile.id}`} className="flex-grow flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback>{profile.username?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{profile.username}</span>
                    {unreadCounts?.[profile.id] && (
                        <Badge variant="destructive">{unreadCounts[profile.id]}</Badge>
                    )}
                  </div>
                </Link>
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => handleArchive(profile.id)}>
                        <Archive className="h-5 w-5" />
                        <span className="sr-only">Archive</span>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/chat/${profile.id}`}>
                        <MessageSquare className="h-5 w-5" />
                      </Link>
                    </Button>
                </div>
              </div>
            ))}
            {filteredProfiles?.length === 0 && !isLoading && <p className="text-center text-muted-foreground">No users found.</p>}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatList;
