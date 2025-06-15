import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Ban, Badge as BadgeIcon, User, TimerOff, UserCheck } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Profile } from '@/types';
import { toast } from 'sonner';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

const fetchUsers = async (): Promise<Profile[]> => {
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
    const { profile: currentAdminProfile } = useAuth();
    const { data: users, isLoading, error } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: fetchUsers,
    });

    const [isBadgeDialogOpen, setIsBadgeDialogOpen] = useState(false);
    const [isRestrictDialogOpen, setIsRestrictDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
    const [badgeText, setBadgeText] = useState('');
    const [restrictionDuration, setRestrictionDuration] = useState(''); // In hours
    
    const { mutate: permanentBan, isPending: isBanningUser } = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: true, banned_until: null })
                .eq('id', userId);
            if (error) throw new Error(error.message);
            return userId;
        },
        onSuccess: (userId) => {
            toast.success('User has been permanently banned.');
            queryClient.setQueryData(['adminUsers'], (oldData: Profile[] | undefined) => 
                oldData ? oldData.map(user => user.id === userId ? { ...user, is_banned: true, banned_until: null } : user) : []
            );
        },
        onError: (error: Error) => {
            toast.error(`Failed to ban user: ${error.message}`);
        },
    });

    const { mutate: unbanUser, isPending: isUnbanningUser } = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: false, banned_until: null })
                .eq('id', userId);
            if (error) throw new Error(error.message);
            return userId;
        },
        onSuccess: (userId) => {
            toast.success('User restriction has been removed.');
            queryClient.setQueryData(['adminUsers'], (oldData: Profile[] | undefined) => 
                oldData ? oldData.map(user => user.id === userId ? { ...user, is_banned: false, banned_until: null } : user) : []
            );
        },
        onError: (error: Error) => {
            toast.error(`Failed to remove restriction: ${error.message}`);
        },
    });

    const { mutate: updateBadge, isPending: isUpdatingBadge } = useMutation({
        mutationFn: async ({ userId, badge }: { userId: string, badge: string }) => {
            const newBadge = badge || null;
            const { error } = await supabase
                .from('profiles')
                .update({ badge: newBadge })
                .eq('id', userId);
            
            if (error) {
                throw new Error(error.message);
            }
            return { userId, badge: newBadge };
        },
        onSuccess: ({ userId, badge }) => {
            toast.success("User's badge has been updated.");
            setIsBadgeDialogOpen(false);
            queryClient.setQueryData(['adminUsers'], (oldData: Profile[] | undefined) =>
                oldData ? oldData.map(user => user.id === userId ? { ...user, badge } : user) : []
            );
        },
        onError: (error: Error) => {
            toast.error(`Failed to update badge: ${error.message}`);
        },
    });

    const { mutate: restrictUser, isPending: isRestrictingUser } = useMutation({
        mutationFn: async ({ userId, hours }: { userId: string; hours: number }) => {
            if (hours <= 0) {
                throw new Error("Restriction duration must be positive.");
            }
            const bannedUntil = new Date();
            bannedUntil.setHours(bannedUntil.getHours() + hours);
            const bannedUntilISO = bannedUntil.toISOString();
    
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: true, banned_until: bannedUntilISO })
                .eq('id', userId);
            
            if (error) { throw new Error(error.message); }
            return { userId, banned_until: bannedUntilISO };
        },
        onSuccess: ({ userId, banned_until }) => {
            toast.success("User has been restricted.");
            setIsRestrictDialogOpen(false);
            setRestrictionDuration('');
            queryClient.setQueryData(['adminUsers'], (oldData: Profile[] | undefined) =>
                oldData ? oldData.map(user => user.id === userId ? { ...user, is_banned: true, banned_until } : user) : []
            );
        },
        onError: (error: Error) => {
            toast.error(`Failed to restrict user: ${error.message}`);
        },
    });

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
                                {users.map(user => {
                                    const isSelf = user.id === currentAdminProfile?.id;
                                    return (
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
                                                {user.is_banned ? (
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={() => unbanUser(user.id)}
                                                        disabled={isUnbanningUser || isSelf}
                                                        title={isSelf ? "You cannot modify your own status" : "Unban User"}
                                                    >
                                                        <UserCheck className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => permanentBan(user.id)}
                                                            disabled={isBanningUser || isSelf}
                                                            title={isSelf ? "You cannot modify your own status" : "Permanently Ban User"}
                                                        >
                                                            <Ban className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="icon" 
                                                            onClick={() => handleOpenRestrictDialog(user)}
                                                            disabled={isSelf}
                                                            title={isSelf ? "You cannot modify your own status" : "Temporarily Restrict User"}
                                                        >
                                                            <TimerOff className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => handleOpenBadgeDialog(user)}
                                                    disabled={isSelf}
                                                    title={isSelf ? "You cannot edit your own badge" : "Edit User Badge"}
                                                >
                                                    <BadgeIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )})}
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
