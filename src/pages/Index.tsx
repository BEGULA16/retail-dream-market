
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard, { Product } from "@/components/ProductCard";

const products: Product[] = [
  {
    id: 1,
    name: "Sleek Laptop",
    price: "$1,200",
    imageUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=80",
    imageAlt: "A sleek, modern laptop on a desk.",
  },
  {
    id: 2,
    name: "Developer's MacBook",
    price: "$1,450",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80",
    imageAlt: "MacBook with code on the screen.",
  },
  {
    id: 3,
    name: "Gray Laptop",
    price: "$950",
    imageUrl: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=600&q=80",
    imageAlt: "A gray laptop computer turned on.",
  },
  {
    id: 4,
    name: "Workstation Pro",
    price: "$1,999",
    imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&q=80",
    imageAlt: "A person using a MacBook Pro at a desk.",
  },
];

const Index = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-8">
            Our Products
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {products.map((product) => (
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
