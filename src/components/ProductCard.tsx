
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

export interface Product {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  imageAlt: string;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="group relative border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <div className="aspect-square w-full overflow-hidden bg-gray-200">
        <img
          src={product.imageUrl}
          alt={product.imageAlt}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-base font-semibold text-foreground">
          <a href="#">
            <span aria-hidden="true" className="absolute inset-0" />
            {product.name}
          </a>
        </h3>
        <p className="mt-1 text-lg font-bold text-primary">{product.price}</p>
        <div className="mt-auto pt-4">
          <Button className="w-full">
            <ShoppingCart className="mr-2 h-4 w-4" /> Add to cart
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
