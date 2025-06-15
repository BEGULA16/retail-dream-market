
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Rating } from '@/types';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from './ui/skeleton';
import { Card, CardContent } from './ui/card';

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
    .select('*')
    .in('product_id', productIds)
    .order('created_at', { ascending: false });

  if (ratingsError) {
    console.error("Error fetching ratings:", ratingsError);
    throw new Error(ratingsError.message);
  }

  if (!ratingsData || ratingsData.length === 0) {
    return [];
  }

  const userIds = [...new Set(ratingsData.map(r => r.user_id).filter(Boolean as any))];

  if (userIds.length === 0) {
    return ratingsData.map(r => ({ ...r, profiles: null })) as Rating[];
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);
  
  if (profilesError) {
    console.error("Error fetching reviewer profiles:", profilesError);
    return ratingsData.map(r => ({ ...r, profiles: null })) as Rating[];
  }

  const profilesMap = new Map(profilesData.map(p => [p.id, p]));

  const combinedData = ratingsData.map(rating => ({
    ...rating,
    profiles: rating.user_id ? profilesMap.get(rating.user_id) ?? null : null
  }));

  return combinedData as Rating[];
};

const SellerRatings = ({ sellerId }: { sellerId: string }) => {
  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['sellerRatings', sellerId],
    queryFn: () => fetchSellerProductRatings(sellerId),
  });

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Reviews on Seller's Products</h2>
      {ratings.length === 0 ? (
        <p className="text-muted-foreground">This seller has no reviews on their products yet.</p>
      ) : (
        <div className="space-y-6">
          {ratings.map(rating => (
            <Card key={rating.id}>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                    <Avatar>
                        <AvatarImage src={rating.profiles?.avatar_url || undefined} alt={rating.profiles?.username || ''} />
                        <AvatarFallback>{rating.profiles?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">{rating.profiles?.username || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}</p>
                        </div>
                        </div>
                        <div className="flex items-center my-2">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-5 w-5 ${i < rating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                        </div>
                        {rating.comment && <p className="text-foreground/90 whitespace-pre-wrap">{rating.comment}</p>}
                        {rating.image_url && <img src={rating.image_url} alt="Review image" className="mt-2 rounded-lg max-w-xs max-h-64 object-contain" />}
                    </div>
                    </div>
                </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerRatings;
