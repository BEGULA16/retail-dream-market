
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import NotFound from "./NotFound";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

const fetchProduct = async (id: string): Promise<Product | null> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching product ${id}:`, error);
    if (error.code === 'PGRST116') return null; // Row not found
    throw new Error(error.message);
  }

  if (!data) return null;

  return {
    ...data,
    price: `$${data.price.toFixed(2)}`,
  };
};

const ProductDetailSkeleton = () => (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
            <Skeleton className="h-10 w-40 rounded-md" />
        </div>
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
          <div>
            <Skeleton className="aspect-square w-full rounded-lg mb-4" />
            <div className="grid grid-cols-5 gap-2">
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="aspect-square w-full rounded-md" />
              <Skeleton className="aspect-square w-full rounded-md" />
            </div>
          </div>
          <div className="flex flex-col justify-center space-y-4">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="h-10 w-3/4 rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <div className="flex items-baseline justify-between">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </main>
      <Footer />
    </div>
);


const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id!),
    enabled: !!id,
  });

  const imageUrls = product?.image ? product.image.split(',') : [];
  const [mainImage, setMainImage] = useState(imageUrls[0]);

  if (!mainImage && imageUrls.length > 0) {
    setMainImage(imageUrls[0]);
  }
  
  const handleChatSeller = () => {
    if (user) {
      navigate("/chat");
    } else {
      navigate("/auth");
    }
  };

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (isError || !product) {
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
          <div>
            <div className="aspect-square w-full bg-gray-200 rounded-lg overflow-hidden mb-4">
              <img
                src={mainImage || '/placeholder.svg'}
                alt={product.info}
                className="h-full w-full object-cover object-center"
              />
            </div>
            {imageUrls.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {imageUrls.map((url, index) => (
                  <div 
                    key={index} 
                    className={`aspect-square bg-gray-200 rounded-md overflow-hidden cursor-pointer border-2 ${mainImage === url ? 'border-primary' : 'border-transparent'}`}
                    onClick={() => setMainImage(url)}
                  >
                    <img src={url} alt={`Product thumbnail ${index + 1}`} className="h-full w-full object-cover object-center" />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="w-fit mb-4">
              {product.category}
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground mb-4">{product.name}</h1>
            <p className="text-muted-foreground text-lg mb-6">{product.description}</p>
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
