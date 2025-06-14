
import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import products from "@/data/products.json";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Fuse from "fuse.js";

const Index = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOption, setSortOption] = useState("default");

  const categories = useMemo(() => {
    const allCategories = products.map((p) => p.category);
    return ["All", ...Array.from(new Set(allCategories))];
  }, []);

  const filteredProducts = useMemo(() => {
    const categoryFiltered = products.filter((product) => {
      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;
      return matchesCategory;
    });

    let productsToDisplay = categoryFiltered;

    if (searchTerm.trim()) {
      const fuse = new Fuse(categoryFiltered, {
        keys: ["name", "description"],
        threshold: 0.4,
      });
      productsToDisplay = fuse.search(searchTerm).map((result) => result.item);
    }
    
    if (sortOption !== "default") {
      const parsePrice = (price: string) => Number(price.replace(/[^0-9.]/g, ''));
      // Create a new array before sorting to avoid mutating the original
      productsToDisplay = [...productsToDisplay].sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);
        return sortOption === "price-asc" ? priceA - priceB : priceB - priceA;
      });
    }

    return productsToDisplay;
  }, [searchTerm, selectedCategory, sortOption]);

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
            <div className="w-full sm:w-auto">
              <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-auto">
              <Select onValueChange={setSortOption} value={sortOption}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-8">
            Our Products
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
