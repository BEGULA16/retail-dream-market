
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Flag, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useHeadAdmin } from "@/hooks/useHeadAdmin";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const isOutOfStock = !product.stock || product.stock <= 0;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: headAdmin } = useHeadAdmin();
  const queryClient = useQueryClient();

  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
    mutationFn: async (productId: number) => {
      const { error: ratingsError } = await supabase.from('ratings').delete().eq('product_id', productId);
      if (ratingsError) throw ratingsError;

      const { error: productError } = await supabase.from('products').delete().eq('id', productId);
      if (productError) throw productError;
    },
    onSuccess: () => {
        toast({ title: "Product Deleted", description: "The product has been successfully removed." });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['sellerProducts', product.seller_id] });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error deleting product", description: error.message });
    }
  });

  const handleDeleteProduct = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteProduct(product.id);
  };

  const handleChatSeller = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.seller_id) {
        toast({
            variant: "destructive",
            title: "Seller not available",
            description: "This product does not have a seller assigned.",
        });
        return;
    }
    if (user) {
        if (user.id === product.seller_id) {
            toast({ title: "This is your product", description: "You cannot chat with yourself." });
            return;
        }
        const message = `Hi I am interested on this item\n${product.name}\nwilling to pay ${product.price}`;
        const imageUrl = product.image ? product.image.split(',')[0] : undefined;
        navigate(`/chat/${product.seller_id}`, { state: { prefilledMessage: message, prefilledImage: imageUrl, autoSend: true } });
    } else {
        navigate('/auth');
    }
  };
  
  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
        navigate('/auth');
        return;
    }

    if (!headAdmin) {
        toast({
            title: "Cannot Submit Report",
            description: "The head administrator is not configured to receive reports at this time.",
            variant: "destructive",
        });
        return;
    }
    
    const message = `Hi, I'm reporting this item named "${product.name}" with the ID of ${product.id} for having inappropriate content.`;
    const imageUrl = product.image ? product.image.split(',')[0] : undefined;
    navigate(`/chat/${headAdmin.id}`, { state: { prefilledMessage: message, prefilledImage: imageUrl, autoSend: true } });
  };

  const imageUrl = product.image ? product.image.split(',')[0] : '/placeholder.svg';

  return (
    <div
      className={`group relative border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col ${
        isOutOfStock ? "opacity-60 grayscale" : ""
      }`}
    >
      <div className="aspect-square w-full overflow-hidden bg-gray-200">
        <img
          src={imageUrl}
          alt={product.info}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <Badge variant="secondary" className="w-fit mb-2">
          {product.category}
        </Badge>
        <h3 className="text-base font-semibold text-foreground">
          <Link
            to={`/product/${product.id}`}
            className={isOutOfStock ? "pointer-events-none" : ""}
          >
            <span aria-hidden="true" className="absolute inset-0" />
            {product.name}
          </Link>
        </h3>
        {profile?.is_admin && (
            <p className="text-xs text-muted-foreground mt-1">ID: {product.id}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground truncate">
          {product.description}
        </p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-lg font-bold text-primary">{product.price}</p>
          {typeof product.stock !== "undefined" && (
            <p className="text-sm text-muted-foreground">
              {product.stock > 0
                ? `${product.stock} in stock`
                : "Out of Stock"}
            </p>
          )}
        </div>
        <div className="mt-auto pt-4 flex items-center gap-2">
          <Button className="w-full" onClick={handleChatSeller}>
            Chat Seller
          </Button>
          <Button variant="outline" size="icon" onClick={handleReport} aria-label="Report item">
            <Flag className="h-4 w-4" />
          </Button>
          {profile?.is_admin &&
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon" aria-label="Delete item" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the product and all its reviews. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProduct}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          }
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
