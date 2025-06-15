
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import products from "@/data/products.json";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import NotFound from "./NotFound";
import { useAuth } from "@/hooks/useAuth";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const product: Product | undefined = products.find(
    (p) => p.id === Number(id)
  );
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleChatSeller = () => {
    if (user) {
      navigate("/chat");
    } else {
      navigate("/auth");
    }
  };

  if (!product) {
    return <NotFound />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
              </Link>
            </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          <div className="aspect-square w-full bg-gray-200 rounded-lg overflow-hidden">
            <img
              src={product.image}
              alt={product.info}
              className="h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="w-fit mb-4">
              {product.category}
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">{product.name}</h1>
            <p className="text-muted-foreground text-lg mb-6">{product.info}</p>
            <div className="flex items-baseline justify-between mb-6">
                <p className="text-3xl font-bold text-primary">{product.price}</p>
                {typeof product.stock !== 'undefined' && (
                    <p className="text-md text-muted-foreground">
                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of Stock'}
                    </p>
                )}
            </div>
            <Button size="lg" onClick={handleChatSeller}>
                Go to chat list
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ProductDetail;
