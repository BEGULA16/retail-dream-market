
"use client";

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Rating } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { RatingForm } from './RatingForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Star, Edit, Trash2, MessageSquarePlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from './ui/skeleton';

const fetchProductRatings = async (productId: number): Promise<Rating[]> => {
  const { data, error } = await supabase
    .from('ratings')
    .select('*, profiles(username, avatar_url)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching ratings:", error);
    throw new Error(error.message);
  }
  return data as Rating[];
};

const Ratings = ({ productId }: { productId: number }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ratingToEdit, setRatingToEdit] = useState<Rating | null>(null);

  const { data: ratings = [], isLoading } = useQuery({
    queryKey: ['ratings', productId],
    queryFn: () => fetchProductRatings(productId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ratingId: number) => {
      const { error } = await supabase.from('ratings').delete().eq('id', ratingId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review Deleted", description: "Your review has been successfully deleted." });
      queryClient.invalidateQueries({ queryKey: ['ratings', productId] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error Deleting Review", description: error.message });
    },
  });

  const userHasRated = useMemo(() => ratings.some(r => r.user_id === user?.id), [ratings, user]);

  const handleEdit = (rating: Rating) => {
    setRatingToEdit(rating);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setRatingToEdit(null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setIsFormOpen(false);
    setRatingToEdit(null);
  }
  
  if (isLoading) {
      return (
          <div className="mt-12">
              <Skeleton className="h-8 w-48 mb-6" />
              <div className="space-y-6">
                  {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex gap-4">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/4" />
                              <Skeleton className="h-4 w-1/2" />
                              <Skeleton className="h-16 w-full" />
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  return (
    <div className="mt-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Customer Reviews</h2>
        {user && !userHasRated && (
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddNew}><MessageSquarePlus className="mr-2" /> Write a review</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{ratingToEdit ? "Edit your review" : "Write a review"}</DialogTitle>
              </DialogHeader>
              <RatingForm productId={productId} onFormSubmit={closeForm} ratingToEdit={ratingToEdit} />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {ratings.length === 0 ? (
        <p className="text-muted-foreground">No reviews yet. Be the first to write one!</p>
      ) : (
        <div className="space-y-6">
          {ratings.map(rating => (
            <div key={rating.id} className="flex gap-4">
              <Avatar>
                <AvatarImage src={rating.profiles?.avatar_url || undefined} alt={rating.profiles?.username} />
                <AvatarFallback>{rating.profiles?.username?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{rating.profiles?.username || 'Anonymous'}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(rating.created_at), { addSuffix: true })}</p>
                  </div>
                  {user?.id === rating.user_id && (
                     <Dialog open={isFormOpen && ratingToEdit?.id === rating.id} onOpenChange={(open) => !open && closeForm()}>
                        <div className="flex gap-2">
                           <DialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => handleEdit(rating)}>
                                 <Edit className="h-4 w-4" />
                              </Button>
                           </DialogTrigger>
                           <AlertDialog>
                              <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                              <AlertDialogContent>
                                 <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This will permanently delete your review.</AlertDialogDescription>
                                 </AlertDialogHeader>
                                 <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(rating.id)}>Delete</AlertDialogAction>
                                 </AlertDialogFooter>
                              </AlertDialogContent>
                           </AlertDialog>
                        </div>
                        <DialogContent>
                           <DialogHeader>
                              <DialogTitle>Edit your review</DialogTitle>
                           </DialogHeader>
                           <RatingForm productId={productId} onFormSubmit={closeForm} ratingToEdit={ratingToEdit} />
                        </DialogContent>
                     </Dialog>
                  )}
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
          ))}
        </div>
      )}
    </div>
  );
};

export default Ratings;

