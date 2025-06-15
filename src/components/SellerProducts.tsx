
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Product } from '@/types';
import ProductCard from './ProductCard';
import { Skeleton } from './ui/skeleton';

const fetchSellerProducts = async (sellerId: string): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', sellerId);

  if (error) {
    console.error("Error fetching seller's products:", error);
    throw new Error(error.message);
  }

  if (!data) {
    return [];
  }

  return data.map(p => ({...p, price: `$${p.price.toFixed(2)}`}));
};

const SellerProducts = ({ sellerId }: { sellerId:string }) => {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['sellerProducts', sellerId],
    queryFn: () => fetchSellerProducts(sellerId),
    enabled: !!sellerId,
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">Items for Sale</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="border rounded-lg overflow-hidden shadow-sm">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Items for Sale</h2>
      {products.length === 0 ? (
        <p className="text-muted-foreground">This seller has no items for sale.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerProducts;
