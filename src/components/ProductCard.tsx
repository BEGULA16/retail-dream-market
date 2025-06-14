
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  return (
    <div className="group relative border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col">
      <div className="aspect-square w-full overflow-hidden bg-gray-200">
        <img
          src={product.image}
          alt={product.info}
          className="h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <Badge variant="secondary" className="w-fit mb-2">
          {product.category}
        </Badge>
        <h3 className="text-base font-semibold text-foreground">
          <Link to={`/product/${product.id}`}>
            <span aria-hidden="true" className="absolute inset-0" />
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm text-muted-foreground truncate">{product.description}</p>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-lg font-bold text-primary">{product.price}</p>
          {typeof product.stock !== 'undefined' && (
            <p className="text-sm text-muted-foreground">
              {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
            </p>
          )}
        </div>
        <div className="mt-auto pt-4">
          <Button className="w-full">
            Place order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
