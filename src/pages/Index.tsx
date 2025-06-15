import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Store } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Fuse from "fuse.js";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SellForm from "@/components/SellForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Product } from "@/types";

const fetchProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching products:", error);
    throw new Error(error.message);
  }
  
  // Map Supabase product data to local Product type
  return data.map(p => ({
    ...p,
    price: `$${p.price.toFixed(2)}`,
  }));
};

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("default");
  const { totalUnreadCount } = useUnreadCounts();

  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: fetchProducts
  });

  const categories = useMemo(() => {
    if (!products) return ["All"];
    const allCategories = products.map((p) => p.category);
    return ["All", ...Array.from(new Set(allCategories))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let productsToDisplay = products.filter((product) => {
      return selectedCategory === "All" || product.category === selectedCategory;
    });

    if (searchTerm.trim()) {
      const fuse = new Fuse(productsToDisplay, {
        keys: ["name", "description"],
        threshold: 0.4,
      });
      productsToDisplay = fuse.search(searchTerm).map((result) => result.item);
    }

    if (sortOption !== "default") {
      const parsePrice = (price: string) => Number(price.replace(/[^0-9.]/g, ''));
      productsToDisplay = [...productsToDisplay].sort((a, b) => {
        switch (sortOption) {
          case "price-asc":
            return parsePrice(a.price) - parsePrice(b.price);
          case "price-desc":
            return parsePrice(b.price) - parsePrice(a.price);
          case "stock-asc":
            return (a.stock ?? 0) - (b.stock ?? 0);
          case "stock-desc":
            return (b.stock ?? 0) - (a.stock ?? 0);
          default:
            return 0;
        }
      });
    }

    return productsToDisplay;
  }, [searchTerm, selectedCategory, sortOption, products]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
            <div className="relative w-full sm:flex-grow">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            <div className="grid grid-cols-2 sm:flex w-full sm:w-auto gap-4">
              <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category === "All" ? "Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select onValueChange={setSortOption} value={sortOption}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Sort</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="stock-desc">Most Stock</SelectItem>
                  <SelectItem value="stock-asc">Least Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Our Products
            </h1>
            <div className="flex items-center gap-4">
              <Button asChild>
                <Link to="/seller-panel">
                  <Store className="mr-2 h-4 w-4" /> Seller Panel
                </Link>
              </Button>

              <Button asChild className="relative">
                <Link to="/chat">
                  <MessageSquare /> Go to Chat
                  {totalUnreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] flex items-center justify-center rounded-full p-1 text-xs">
                      {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>
            </div>
          </div>
          {isLoading && <p className="text-center">Loading products...</p>}
          {isError && <p className="text-center text-destructive">Error loading products. Please try again later.</p>}
          {!isLoading && !isError && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
