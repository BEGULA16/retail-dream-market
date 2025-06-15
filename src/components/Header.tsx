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
import { LogOut, MessageSquare, User as UserIcon, Bell, BellRing, Store } from 'lucide-react';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const Header = () => {
  const { user, session, profile } = useAuth();
  const navigate = useNavigate();
  const { totalUnreadCount } = useUnreadCounts();
  const { permission, requestNotificationPermission } = useNotifications();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getInitials = () => {
    const name = profile?.username || user?.email;
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  };

  const handleRequestPermission = async () => {
    await requestNotificationPermission();
    // After the promise resolves, Notification.permission will be updated.
    if (Notification.permission === 'granted') {
        toast.success('Notifications enabled!');
        new Notification('RetailDream Notifications', {
            body: 'You will now receive notifications for new messages.',
            icon: '/favicon.ico',
        });
    } else if (Notification.permission === 'denied') {
        toast.error('Notifications permission was denied. You can change this in your browser settings.');
    }
  };

  if (profile?.is_banned) {
    const isTemporarilyBanned = profile.banned_until && new Date(profile.banned_until) > new Date();

    const BanScreen = ({ children }: { children: React.ReactNode }) => (
        <div className="fixed inset-0 bg-background z-[100] flex items-center justify-center p-4">
            <div className="text-center max-w-md mx-auto">
                {children}
            </div>
        </div>
    );
    
    if (isTemporarilyBanned) {
        return (
            <BanScreen>
                <h1 className="text-4xl font-bold text-destructive">Account Restricted</h1>
                <p className="text-muted-foreground mt-2">
                    Your account is temporarily restricted. You can access the site again {formatDistanceToNow(new Date(profile.banned_until!), { addSuffix: true })}.
                </p>
            </BanScreen>
        );
    }

    return (
        <BanScreen>
            <h1 className="text-4xl font-bold text-destructive">You are Banned</h1>
            <p className="text-muted-foreground mt-2">You are permanently banned from accessing this site. If you believe this is a mistake, please contact support.</p>
        </BanScreen>
    );
  }

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
                      <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.username} />
                      <AvatarFallback>{getInitials()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile?.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Profile</Link>
                  </DropdownMenuItem>
                  {user?.user_metadata?.is_seller && (
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link to="/seller-panel">
                        <Store className="mr-2 h-4 w-4" />
                        Seller Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
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
                  {permission === 'default' && (
                    <DropdownMenuItem onClick={handleRequestPermission} className="cursor-pointer">
                      <Bell className="mr-2 h-4 w-4" />
                      Enable Notifications
                    </DropdownMenuItem>
                  )}
                   {permission === 'granted' && (
                    <DropdownMenuItem disabled>
                      <BellRing className="mr-2 h-4 w-4" />
                      <span>Notifications Enabled</span>
                    </DropdownMenuItem>
                  )}
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
