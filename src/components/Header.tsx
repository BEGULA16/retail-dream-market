
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';

const Header = () => {
  const items = useCartStore((state) => state.items);

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold text-primary">
              RetailDream
            </a>
          </div>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Products
            </a>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {items.length}
                </span>
              )}
              <span className="sr-only">Shopping Cart</span>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
