
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Profile {
  id: string;
  username: string;
}

const fetchProfiles = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username');

  if (error) {
    console.error('Error fetching profiles:', error);
    throw new Error(error.message);
  }
  return data || [];
};

const ChatList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const filteredProfiles = profiles?.filter(profile =>
    profile.username?.toLowerCase().includes(searchTerm.toLowerCase()) && profile.id !== user?.id
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
              <Link to={`/chat/${profile.id}`} key={profile.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{profile.username?.[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{profile.username}</span>
                </div>
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </Link>
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
