
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
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { IMGBB_API_KEY } from "@/config";
import { Product } from "@/types";

const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function SellForm({ onFormSubmit, productToEdit }: { onFormSubmit: () => void; productToEdit?: Product | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!productToEdit;

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
      .refine(
        (files) => isEditMode || (files instanceof FileList && files.length > 0),
        "At least one image is required."
      )
      .refine(
        (files) => !files || files.length === 0 || files.length <= 6,
        "You can upload a maximum of 6 images (1 main + 5 additional)."
      )
      .refine(
        (files) => !files || files.length === 0 || Array.from(files).every((file: any) => file.size <= MAX_FILE_SIZE),
        `Max file size is 30MB per image.`
      )
      .refine(
        (files) => !files || files.length === 0 || Array.from(files).every((file: any) => ACCEPTED_IMAGE_TYPES.includes(file.type)),
        ".jpg, .jpeg, .png and .webp files are accepted."
      ),
    info: z.string().min(10, {
      message: "Info must be at least 10 characters.",
    }),
  });


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

  useEffect(() => {
    if (productToEdit) {
      form.reset({
        name: productToEdit.name,
        description: productToEdit.description,
        price: String(productToEdit.price).replace('$', ''),
        category: productToEdit.category,
        stock: productToEdit.stock ?? 1,
        images: undefined,
        info: productToEdit.info,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        price: "",
        category: "",
        stock: 1,
        images: undefined,
        info: "",
      });
    }
  }, [productToEdit, form]);

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

    if (user.email !== 'damiankehnan@proton.me' && !isEditMode) {
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

    let imageUrlsString = isEditMode ? productToEdit.image : '';
    const files = values.images as FileList | undefined;

    if (files && files.length > 0) {
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
      imageUrlsString = uploadedImageUrls.join(',');
    }
    
    let error: any;

    if (isEditMode) {
        const { data, error: updateError } = await supabase
            .from("products")
            .update({
                name: values.name,
                description: values.description,
                price: parseFloat(values.price.replace('$', '')),
                category: values.category,
                stock: values.stock,
                info: values.info,
                image: imageUrlsString,
            })
            .eq('id', productToEdit.id)
            .select();
        error = updateError;

        if (!error && (!data || data.length === 0)) {
          error = {
            message: "Could not update product. You may not have permission.",
          }
        }
    } else {
        const { error: insertError } = await supabase.from("products").insert([
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
        error = insertError;
    }

    setIsSubmitting(false);
    if (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: error.message || `There was an error ${isEditMode ? 'updating' : 'listing'} your product. Please try again.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: `Product ${isEditMode ? 'Updated' : 'Submitted'}!`,
        description: `Your product has been successfully ${isEditMode ? 'updated' : 'submitted for listing'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['user-products', user.id] });
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
              <FormLabel>Product Images (up to 6)</FormLabel>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting 
            ? (isEditMode ? "Updating..." : "Submitting...") 
            : (isEditMode ? "Update Product" : "Submit for Listing")}
        </Button>
      </form>
    </Form>
  );
}

export default SellForm;

