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
import { toast } from "@/hooks/use-toast";
import { DialogClose } from "./ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IMGBB_API_KEY } from "@/config";

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Product name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  price: z.string().refine((val) => /^\d+(\.\d{1,2})?$/.test(val.replace('$', '')), {
    message: "Please enter a valid price (e.g., 29.99).",
  }),
  category: z.string().min(2, {
    message: "Category must be at least 2 characters.",
  }),
  stock: z.coerce.number().int().positive({
    message: "Stock must be a positive number.",
  }),
  images: z.any()
    .refine((files): files is FileList => files instanceof FileList && files.length > 0, "At least one image is required.")
    .refine((files): files is FileList => files.length <= 5, "You can upload a maximum of 5 images.")
    .refine(
      (files): files is FileList => Array.from(files).every((file) => file.size <= MAX_FILE_SIZE),
      `Max file size is 30MB per image.`
    )
    .refine(
      (files): files is FileList => Array.from(files).every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  info: z.string().min(10, {
    message: "Info must be at least 10 characters.",
  }),
});

export function SellForm({ onFormSubmit }: { onFormSubmit: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
      stock: 1,
      images: undefined,
      info: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to sell an item.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);

    if (user.email !== 'damiankehnan@proton.me') {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: recentProducts, error: recentError } = await supabase
        .from('products')
        .select('created_at', { count: 'exact' })
        .eq('seller_id', user.id)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentError) {
        console.error("Error checking for recent products:", recentError);
        toast({ title: "Error", description: "Could not verify selling cooldown. Please try again.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      if (recentProducts && recentProducts.length > 0) {
        const lastProductDate = new Date(recentProducts[0].created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastProductDate.getTime()) / (1000 * 60);
        if (diffMinutes < 10) {
          toast({
            title: "Cooldown Active",
            description: `Please wait ${Math.ceil(10 - diffMinutes)} more minute(s) before listing another item.`,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }
    }

    const files = values.images as FileList;
    const uploadedImageUrls = [];
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('image', file);

      try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();

        if (!response.ok || !result.data || !result.data.url) {
            console.error('ImgBB upload failed:', result);
            throw new Error(result.error?.message || 'Failed to upload image to ImgBB');
        }
        uploadedImageUrls.push(result.data.url);
      } catch (uploadError) {
          console.error("Error uploading image:", uploadError);
          toast({ title: "Image Upload Error", description: `Failed to upload ${file.name}. Please try again.`, variant: "destructive" });
          setIsSubmitting(false);
          return;
      }
    }
    const imageUrlsString = uploadedImageUrls.join(',');

    const { error } = await supabase.from("products").insert([
      {
        name: values.name,
        description: values.description,
        price: parseFloat(values.price.replace('$', '')),
        category: values.category,
        stock: values.stock,
        info: values.info,
        image: imageUrlsString,
        seller_id: user.id,
      },
    ]);

    setIsSubmitting(false);
    if (error) {
      console.error("Error inserting product:", error);
      toast({
        title: "Error",
        description: "There was an error listing your product. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Product Submitted!",
        description: "Your product has been submitted for listing.",
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      form.reset();
      onFormSubmit();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Vintage T-Shirt" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price</FormLabel>
              <FormControl>
                <Input placeholder="e.g. 29.99" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Apparel" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g. 10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="images"
          render={({ field: { value, onChange, ...fieldProps } }) => (
            <FormItem>
              <FormLabel>Product Images (up to 5)</FormLabel>
              <FormControl>
                <Input
                  {...fieldProps}
                  type="file"
                  multiple
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={(event) => {
                    onChange(event.target.files);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Info</FormLabel>
              <FormControl>
                <Input placeholder="A brief summary of the product" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us a little more about your product"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogClose asChild>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit for Listing"}
          </Button>
        </DialogClose>
      </form>
    </Form>
  );
}

export default SellForm;
