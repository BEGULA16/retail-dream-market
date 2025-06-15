
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from '@/lib/supabase';
import { LogOut, MessageSquare, User as UserIcon } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { totalUnreadCount } = useUnreadCounts();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getInitials = () => {
    const name = user?.user_metadata?.username || user?.email;
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-background border-b sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              RetailDream
            </Link>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="ghost" asChild>
              <Link to="/">Products</Link>
            </Button>
            <ThemeToggle />
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.username} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.user_metadata?.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/chat" className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Messages</span>
                      </div>
                      {totalUnreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-[1.25rem] flex items-center justify-center rounded-full p-1 text-xs">
                          {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                        </Badge>
                      )}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;
