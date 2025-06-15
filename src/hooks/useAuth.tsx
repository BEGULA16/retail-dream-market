import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Profile } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  refreshAuth: () => Promise<void>;
  isLoadingProfile: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  refreshAuth: () => Promise.resolve(),
  isLoadingProfile: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        console.error('Error fetching profile:', error);
        return null;
    }
    return data as Profile | null;
  }, []);

  const refreshAuth = useCallback(async () => {
    const { data: { session: newSession } } = await supabase.auth.getSession();
    setSession(newSession);
    const authUser = newSession?.user ?? null;
    setUser(authUser);
    if (authUser) {
        const profileData = await fetchProfile(authUser.id);
        setProfile(profileData);
    } else {
        setProfile(null);
    }
  }, [fetchProfile]);

  useEffect(() => {
    setLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/update-password');
        }
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      setIsLoadingProfile(true);
      fetchProfile(user.id).then((profileData) => {
        setProfile(profileData);
        setIsLoadingProfile(false);
      });
    } else {
      setProfile(null);
      setIsLoadingProfile(false);
    }
  }, [user, fetchProfile]);

  // Auto-unban logic for expired temporary bans
  useEffect(() => {
    if (profile?.is_banned && profile.banned_until && new Date(profile.banned_until) < new Date()) {
      const unbanUser = async () => {
        await supabase.from('profiles').update({ is_banned: false, banned_until: null }).eq('id', profile.id);
        await refreshAuth();
      };
      unbanUser();
    }
  }, [profile, refreshAuth]);

  useEffect(() => {
    if (!user) return;

    const profileChannel = supabase
      .channel(`realtime-profile-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          refreshAuth();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user, refreshAuth]);

  // Global message handler for real-time updates
  useEffect(() => {
    if (!user) return;

    console.log('Setting up global message handler for user:', user.id);

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

  if (profile?.is_banned) {
    const isRestrictionActive = profile.banned_until ? new Date(profile.banned_until) > new Date() : true;
    if (isRestrictionActive) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4 text-center">
                <h1 className="text-4xl font-bold text-destructive">You are Banned</h1>
                <p className="mt-4 text-lg">You are restricted from accessing this service.</p>
                {profile.banned_until && (
                    <p className="mt-2 text-muted-foreground">
                        Your ban expires on: {new Date(profile.banned_until).toLocaleString()}
                    </p>
                )}
            </div>
        );
    }
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, refreshAuth, isLoadingProfile }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
