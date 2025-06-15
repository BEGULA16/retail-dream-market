"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Product } from "@/types";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import SellForm from "@/components/SellForm";
import { useToast } from "@/components/ui/use-toast";
import { Edit, Trash2, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";

const fetchUserProducts = async (userId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user products:", error);
    throw new Error(error.message);
  }

  return data.map((p) => ({
    ...p,
    price: `$${p.price.toFixed(2)}`,
  }));
};

const SellerPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["user-products", user?.id],
    queryFn: () => fetchUserProducts(user!.id),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .select();

      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        throw new Error("Could not delete product. You might not have the right permissions.");
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: "Product Deleted", description: "Your product has been successfully deleted." });
      queryClient.invalidateQueries({ queryKey: ["user-products", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error: any) => {
      toast({ variant: "destructive", title: "Error Deleting Product", description: error.message });
    },
  });

  const handleEdit = (product: Product) => {
    setProductToEdit(product);
    setIsSellDialogOpen(true);
  };

  const handleAddNew = () => {
    setProductToEdit(null);
    setIsSellDialogOpen(true);
  };
  
  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Seller Panel
            </h1>
            <Dialog open={isSellDialogOpen} onOpenChange={(isOpen) => {
              setIsSellDialogOpen(isOpen);
              if (!isOpen) {
                setProductToEdit(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <Store className="mr-2 h-4 w-4" /> Sell Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{productToEdit ? "Edit Product" : "List an item for sale"}</DialogTitle>
                  <DialogDescription>
                    {productToEdit ? "Update the details of your product." : "Fill out the details below to list your item on the marketplace."}
                  </DialogDescription>
                </DialogHeader>
                <SellForm 
                  onFormSubmit={() => {
                    setIsSellDialogOpen(false);
                    setProductToEdit(null);
                  }}
                  productToEdit={productToEdit}
                />
              </DialogContent>
            </Dialog>
        </div>

        {isLoading ? (
          <p className="text-center">Loading your products...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">You haven't listed any products yet.</p>
            <p className="text-muted-foreground mt-2">Click "Sell Item" to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="truncate">{product.name}</CardTitle>
                  <CardDescription>{product.price}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    <img src={product.image.split(',')[0]} alt={product.name} className="rounded-md object-cover aspect-video"/>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                   <Button variant="outline" size="icon" onClick={() => handleEdit(product)}>
                        <Edit className="h-4 w-4" />
                   </Button>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete this product.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(product.id)} disabled={deleteMutation.isPending}>
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default SellerPanel;
