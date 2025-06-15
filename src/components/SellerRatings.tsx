
"use client";

import { Rating } from '@/types';
import { Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from './ui/skeleton';
import { Card, CardContent } from './ui/card';

const SellerRatings = ({ ratings, isLoading }: { ratings: Rating[], isLoading: boolean }) => {
  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Reviews on Seller's Products</h2>
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
