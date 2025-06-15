
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { IMGBB_API_KEY } from "@/config";
import { Rating } from "@/types";
import StarRatingInput from "./StarRatingInput";

const MAX_FILE_SIZE = 28 * 1024 * 1024; // 28MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  rating: z.number().min(1, "Rating is required.").max(5),
  comment: z.string().max(1000, "Comment cannot exceed 1000 characters.").optional(),
  image: z.any()
    .optional()
    .refine(
      (file) => !file || (file instanceof File && file.size <= MAX_FILE_SIZE),
      `Max file size is 28MB.`
    )
    .refine(
      (file) => !file || (file instanceof File && ACCEPTED_IMAGE_TYPES.includes(file.type)),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
});

export function RatingForm({ onFormSubmit, productId, ratingToEdit }: { onFormSubmit: () => void; productId: number; ratingToEdit?: Rating | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEditMode = !!ratingToEdit;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      comment: "",
      image: undefined,
    },
  });

  useEffect(() => {
    if (ratingToEdit) {
      form.reset({
        rating: ratingToEdit.rating,
        comment: ratingToEdit.comment || "",
        image: undefined,
      });
    } else {
      form.reset({ rating: 0, comment: "", image: undefined });
    }
  }, [ratingToEdit, form]);

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (!user) throw new Error("You must be logged in.");

      let imageUrl: string | undefined = isEditMode ? ratingToEdit.image_url ?? undefined : undefined;

      if (values.image instanceof File) {
        const formData = new FormData();
        formData.append('image', values.image);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();
        if (!response.ok || !result.data || !result.data.url) {
          throw new Error(result.error?.message || 'Failed to upload image to ImgBB');
        }
        imageUrl = result.data.url;
      }

      const ratingData = {
        user_id: user.id,
        product_id: productId,
        rating: values.rating,
        comment: values.comment,
        image_url: imageUrl,
      };

      if (isEditMode) {
        const { error } = await supabase.from('ratings').update(ratingData).eq('id', ratingToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ratings').insert(ratingData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: `Review ${isEditMode ? 'Updated' : 'Submitted'}!`, description: "Thank you for your feedback." });
      queryClient.invalidateQueries({ queryKey: ['ratings', productId] });
      onFormSubmit();
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Rating</FormLabel>
              <FormControl>
                <StarRatingInput rating={field.value} setRating={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Comment (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Tell us what you think..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Add an Image (optional)</FormLabel>
              <FormControl>
                <Input {...fieldProps} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  onChange={(event) => onChange(event.target.files && event.target.files[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? "Submitting..." : "Submit Review"}
        </Button>
      </form>
    </Form>
  );
}

export default RatingForm;
