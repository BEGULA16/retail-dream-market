
import { ThemeToggle } from './ThemeToggle';

const Header = () => {
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
            <ThemeToggle />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
