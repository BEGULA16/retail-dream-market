
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const isOutOfStock = !product.stock || product.stock <= 0;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
        navigate(`/chat/${product.seller_id}`);
    } else {
        navigate('/auth');
    }
  };
  
  const handleReport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toast({
        title: "Report Submitted",
        description: "Thank you for your report. Our team will review this item.",
    });
    console.log(`Reported product ${product.id}`);
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
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
