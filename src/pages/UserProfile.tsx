
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile, Rating } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Star, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotFound from './NotFound';
import SellerRatings from '@/components/SellerRatings';
import SellerProducts from '@/components/SellerProducts';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, badge')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching user profile:', error);
    throw error;
  }
  return data;
};

const fetchSellerProductRatings = async (sellerId: string): Promise<Rating[]> => {
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('id')
    .eq('seller_id', sellerId);

  if (productsError) {
    console.error("Error fetching seller's products:", productsError);
    throw new Error(productsError.message);
  }

  if (!productsData || productsData.length === 0) {
    return [];
  }

  const productIds = productsData.map(p => p.id);

  const { data: ratingsData, error: ratingsError } = await supabase
    .from('ratings')
    .select('*, profiles:user_id(username, avatar_url)')
    .in('product_id', productIds)
    .order('created_at', { ascending: false });

  if (ratingsError) {
    console.error("Error fetching ratings:", ratingsError);
    throw new Error(ratingsError.message);
  }

  return (ratingsData as Rating[]) || [];
};

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId,
  });

  const { data: ratings = [], isLoading: isLoadingRatings } = useQuery({
    queryKey: ['sellerRatings', userId],
    queryFn: () => fetchSellerProductRatings(userId!),
    enabled: !!userId,
  });

  const totalReviews = ratings.length;
  const averageRating = totalReviews > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

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
                <Skeleton className="h-10 w-44 rounded-md mt-4" />
                <Skeleton className="h-5 w-52 rounded-md mt-4" />
            </div>
            <div className="space-y-12">
              <div>
                <h2 className="text-2xl font-bold mb-6"><Skeleton className="h-8 w-48"/></h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="border rounded-lg overflow-hidden shadow-sm">
                          <Skeleton className="h-48 w-full" />
                          <div className="p-4 space-y-2">
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        </div>
                    ))}
                </div>
              </div>
              <SellerRatings ratings={[]} isLoading={true} />
            </div>
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
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold">{profile.username}</h1>
            {profile.badge && <Badge variant="secondary">{profile.badge}</Badge>}
          </div>
          {user && user.id !== profile.id && (
            <Button onClick={() => navigate(`/chat/${profile.id}`)} className="mt-4">
              <MessageCircle className="mr-2 h-4 w-4" /> Chat with seller
            </Button>
          )}
          {totalReviews > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-5 w-5 ${i < Math.round(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-muted-foreground">{averageRating.toFixed(1)} out of 5 ({totalReviews} reviews)</p>
            </div>
          )}
        </div>
        
        <div className="space-y-12">
            <SellerProducts sellerId={profile.id} />
            <SellerRatings ratings={ratings} isLoading={isLoadingRatings} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default UserProfile;
