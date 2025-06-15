import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Ban, Badge as BadgeIcon, User, TimerOff, ShieldAlert } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Profile } from '@/types';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

const fetchUsers = async (): Promise<Profile[]> => {
    // We are now fetching created_at, badge, and banned_until as well.
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_banned, created_at, badge, banned_until');
    
    if (error) {
        console.error("Error fetching users:", error);
        throw new Error(error.message);
    }

    return data || [];
};

const AdminPanel = () => {
    const queryClient = useQueryClient();
    const { profile, session } = useAuth();
    const navigate = useNavigate();

    const { data: users, isLoading, error } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: fetchUsers,
    });

    const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);
    const [isRestrictDialogOpen, setIsRestrictDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [badgeText, setBadgeText] = useState('');
    const [restrictionDuration, setRestrictionDuration] = useState(''); // In hours
    
    useEffect(() => {
        if (!session) {
            navigate('/auth', { replace: true });
        }
    }, [session, navigate]);

    const { mutate: toggleBan, isPending: isTogglingBan } = useMutation({
        mutationFn: async ({ userId, isCurrentlyBanned }: { userId: string, isCurrentlyBanned: boolean }) => {
            // If the user is currently banned (in any state), we unban them.
            if (isCurrentlyBanned) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_banned: false, banned_until: null })
                    .eq('id', userId);
                if (error) throw new Error(error.message);
            } else {
                // Otherwise, we're applying a new permanent ban.
                const { error } = await supabase
                    .from('profiles')
                    .update({ is_banned: true, banned_until: null })
                    .eq('id', userId);
                if (error) throw new Error(error.message);
            }
        },
        onSuccess: (_, { isCurrentlyBanned }) => {
            const message = isCurrentlyBanned ? 'User has been unbanned.' : 'User has been permanently banned.';
            toast.success(message);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update user status: ${error.message}`);
        }
    });

    const { mutate: updateBadge, isPending: isUpdatingBadge } = useMutation({
        mutationFn: async ({ userId, badge }: { userId: string, badge: string }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ badge: badge || null }) // Send null if badge is empty to remove it
                .eq('id', userId);
            
            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            toast.success("User's badge has been updated.");
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            setIsBadgeDialogOpen(false);
        },
        onError: (error: Error) => {
            toast.error(`Failed to update badge: ${error.message}`);
        }
    });

    const { mutate: restrictUser, isPending: isRestrictingUser } = useMutation({
        mutationFn: async ({ userId, hours }: { userId: string; hours: number }) => {
            if (hours <= 0) {
                throw new Error("Restriction duration must be positive.");
            }
            const bannedUntil = new Date();
            bannedUntil.setHours(bannedUntil.getHours() + hours);
    
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: true, banned_until: bannedUntil.toISOString() })
                .eq('id', userId);
            
            if (error) { throw new Error(error.message); }
        },
        onSuccess: () => {
            toast.success("User has been restricted.");
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
            setIsRestrictDialogOpen(false);
            setRestrictionDuration('');
        },
        onError: (error: Error) => {
            toast.error(`Failed to restrict user: ${error.message}`);
        }
    });

    const handleToggleBan = (user: Profile) => {
        if (!user.id) return;
        toggleBan({ userId: user.id, isCurrentlyBanned: !!user.is_banned });
    };

    const handleOpenBadgeDialog = (user: Profile) => {
        setSelectedUser(user);
        setBadgeText(user.badge || '');
        setIsBadgeDialogOpen(true);
    };

    const handleOpenRestrictDialog = (user: Profile) => {
        setSelectedUser(user);
        setRestrictionDuration('');
        setIsRestrictDialogOpen(true);
    };

    const handleUpdateBadge = () => {
        if (!selectedUser?.id) return;
        updateBadge({ userId: selectedUser.id, badge: badgeText });
    };
    
    const handleRestrictUser = () => {
        if (!selectedUser?.id || !restrictionDuration) return;
        const hours = parseInt(restrictionDuration, 10);
        if (isNaN(hours) || hours <= 0) {
            toast.error("Please enter a valid, positive number of hours.");
            return;
        }
        restrictUser({ userId: selectedUser.id, hours });
    };
    
    const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : 'U');

    if (!profile) {
        return (
            <div className="container mx-auto max-w-4xl py-8 px-4">
                <div className="flex items-center justify-center">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!profile.is_admin) {
        return (
            <div className="container mx-auto max-w-lg py-8 px-4">
                <Card className="text-center">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center text-2xl">
                            <ShieldAlert className="mr-2 h-6 w-6 text-destructive" />
                            Access Denied
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">You do not have permission to view this page.</p>
                        <Button asChild className="mt-6">
                            <Link to="/">Go to Homepage</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-4xl py-8 px-4">
            <Button asChild variant="ghost" className="mb-4">
                <Link to="/profile">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Profile
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Admin Panel</CardTitle>
                    <CardDescription>Manage users and site settings.</CardDescription>
                </CardHeader>
                <CardContent>
                    <h3 className="text-lg font-semibold mb-4">Users</h3>
                    {isLoading && (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full rounded-md" />
                            <Skeleton className="h-12 w-full rounded-md" />
                            <Skeleton className="h-12 w-full rounded-md" />
                        </div>
                    )}
                    {error && <p className="text-destructive">Failed to load users: {error.message}</p>}
                    {users && (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.id} className={user.is_banned ? 'bg-destructive/10' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.username} />
                                                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className={`font-medium ${user.is_banned ? 'line-through' : ''}`}>{user.username}</span>
                                                    <div className="flex items-center gap-2">
                                                        {user.badge && <Badge variant="secondary">{user.badge}</Badge>}
                                                        {user.is_banned && (
                                                            <Badge variant="destructive">
                                                                {user.banned_until && new Date(user.banned_until) > new Date()
                                                                    ? `Restricted (ends ${formatDistanceToNow(new Date(user.banned_until), { addSuffix: true })})`
                                                                    : 'Banned'}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.created_at ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true }) : 'N/A'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => handleToggleBan(user)}
                                                    disabled={isTogglingBan}
                                                    title={user.is_banned ? "Unban User" : "Permanently Ban User"}
                                                >
                                                    {user.is_banned ? <User className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => handleOpenRestrictDialog(user)}
                                                    disabled={user.is_banned}
                                                    title="Temporarily Ban User"
                                                >
                                                    <TimerOff className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => handleOpenBadgeDialog(user)}
                                                    title="Edit User Badge"
                                                >
                                                    <BadgeIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
            <Dialog open={isBadgeDialogOpen} onOpenChange={setIsBadgeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Badge for {selectedUser?.username}</DialogTitle>
                        <DialogDescription>
                            Enter a new badge for this user or leave it empty to remove the current one.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="badge-text">Badge Text</Label>
                        <Input
                            id="badge-text"
                            value={badgeText}
                            onChange={(e) => setBadgeText(e.target.value)}
                            placeholder="e.g. Moderator, VIP"
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsBadgeDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateBadge} disabled={isUpdatingBadge}>
                            {isUpdatingBadge ? 'Saving...' : 'Save Badge'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Dialog open={isRestrictDialogOpen} onOpenChange={setIsRestrictDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Restrict {selectedUser?.username}</DialogTitle>
                        <DialogDescription>
                            Enter the duration in hours to restrict this user. This will be a temporary ban.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="duration-hours">Duration (in hours)</Label>
                        <Input
                            id="duration-hours"
                            type="number"
                            value={restrictionDuration}
                            onChange={(e) => setRestrictionDuration(e.target.value)}
                            placeholder="e.g., 24"
                            min="1"
                        />
                    </div>
                    <DialogFooter>
                         <Button variant="outline" onClick={() => setIsRestrictDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRestrictUser} disabled={isRestrictingUser}>
                            {isRestrictingUser ? 'Restricting...' : 'Restrict User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminPanel;
