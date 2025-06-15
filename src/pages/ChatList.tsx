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

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, badge');

  if (error) {
    console.error('Error fetching profiles:', error);
    throw new Error(error.message);
  }
  return (data as Profile[]) || [];
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

const fetchChatPartners = async (userId: string): Promise<string[]> => {
    const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select('recipient_id')
        .eq('sender_id', userId);

    if (sentError) {
        console.error('Error fetching sent messages for partners', sentError);
        throw sentError;
    }

    const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('recipient_id', userId);
    
    if (receivedError) {
        console.error('Error fetching received messages for partners', receivedError);
        throw receivedError;
    }

    const partnerIds = new Set([
        ...sentMessages.map(m => m.recipient_id),
        ...receivedMessages.map(m => m.sender_id),
    ]);

    return Array.from(partnerIds);
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

  const { data: profiles, isLoading: isLoadingProfiles } = useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
    enabled: !!user,
  });

  const { data: chatPartnerIds, isLoading: isLoadingChatPartners } = useQuery({
      queryKey: ['chatPartners', user?.id],
      queryFn: () => fetchChatPartners(user!.id),
      enabled: !!user,
  });

  const { data: archivedIds } = useQuery({
      queryKey: ['archivedConversations', user?.id],
      queryFn: () => fetchArchivedConversations(user!.id),
      enabled: !!user,
  });

  const { unreadCounts } = useUnreadCounts();

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

  const isLoading = isLoadingProfiles || isLoadingChatPartners;

  let filteredProfiles: Profile[] | undefined;

  const allProfilesToFilter = profiles?.filter(p => p.id !== user?.id);

  if (searchTerm.trim()) {
    const usersForSearch = allProfilesToFilter?.filter(profile => {
        const isArchived = archivedIds?.includes(profile.id);
        if (showArchived) {
            return isArchived;
        }
        return !isArchived;
    });

    filteredProfiles = new Fuse(usersForSearch || [], {
        keys: ['username'],
        threshold: 0.4,
    }).search(searchTerm).map(result => result.item);
  } else {
      if (showArchived) {
          filteredProfiles = allProfilesToFilter?.filter(profile => {
              return archivedIds?.includes(profile.id);
          });
      } else {
          filteredProfiles = allProfilesToFilter?.filter(profile => {
              const isPartner = chatPartnerIds?.includes(profile.id);
              const isArchived = archivedIds?.includes(profile.id);
              return isPartner && !isArchived;
          });
      }
  }

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
            <h1 className="text-3xl font-bold">{showArchived ? "Archived Chats" : "Your Conversations"}</h1>
            <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
                <Archive className="mr-2 h-4 w-4" />
                {showArchived ? "View Active Chats" : "View Archived Chats"}
            </Button>
        </div>
        <div className="mb-4">
          <Input
            placeholder={showArchived ? "Search in archived users..." : "Search for any user to start a new chat..."}
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
                    {profile.badge && <Badge variant="secondary">{profile.badge}</Badge>}
                    {unreadCounts?.[profile.id] && !showArchived && (
                        <Badge variant="destructive">{unreadCounts[profile.id]}</Badge>
                    )}
                  </div>
                </Link>
                <div className="flex items-center">
                    {showArchived ? (
                        <Button variant="ghost" size="icon" onClick={() => handleUnarchive(profile.id)}>
                            <ArchiveRestore className="h-5 w-5" />
                            <span className="sr-only">Unarchive</span>
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" onClick={() => handleArchive(profile.id)}>
                            <Archive className="h-5 w-5" />
                            <span className="sr-only">Archive</span>
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/chat/${profile.id}`}>
                        <MessageSquare className="h-5 w-5" />
                      </Link>
                    </Button>
                </div>
              </div>
            ))}
            {filteredProfiles?.length === 0 && !isLoading && (
              <p className="text-center text-muted-foreground">
                {searchTerm.trim()
                  ? "No users found."
                  : showArchived
                  ? "No archived users found."
                  : "You have no active conversations. Search for a user to start chatting."
                }
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ChatList;
