
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotFound from './NotFound';
import SellerRatings from '@/components/SellerRatings';

const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching user profile:', error);
    throw error;
  }
  return data;
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="mb-8">
                <Skeleton className="h-10 w-28 rounded-md" />
            </div>
            <div className="flex flex-col items-center text-center mb-12">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-8 w-48 rounded-md" />
            </div>
            <SellerRatings sellerId={userId!} />
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !profile) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
            <Button variant="outline" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
        </div>
        <div className="flex flex-col items-center text-center mb-12">
          <Avatar className="h-24 w-24 text-4xl mb-4">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
            <AvatarFallback>{profile.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold">{profile.username}</h1>
        </div>
        
        <SellerRatings sellerId={profile.id} />
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
