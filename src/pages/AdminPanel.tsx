import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Ban, Badge as BadgeIcon, User } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Profile } from '@/types';
import { toast } from 'sonner';

const fetchUsers = async (): Promise<Profile[]> => {
    // We are fetching only the columns that are known to exist to avoid errors.
    // 'created_at' and 'badge' seem to be missing from your 'profiles' table.
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_banned');
    
    if (error) {
        console.error("Error fetching users:", error);
        throw new Error(error.message);
    }

    return data || [];
};

const AdminPanel = () => {
    const queryClient = useQueryClient();
    const { data: users, isLoading, error } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: fetchUsers,
    });
    
    const { mutate: toggleBan, isPending: isTogglingBan } = useMutation({
        mutationFn: async ({ userId, newBanStatus }: { userId: string, newBanStatus: boolean }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ is_banned: newBanStatus })
                .eq('id', userId);
            
            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: (_, { newBanStatus }) => {
            toast.success(`User has been ${newBanStatus ? 'banned' : 'unbanned'}.`);
            queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
        },
        onError: (error: Error) => {
            toast.error(`Failed to update user status: ${error.message}`);
        }
    });

    const handleToggleBan = (user: Profile) => {
        if (!user.id) return;
        toggleBan({ userId: user.id, newBanStatus: !user.is_banned });
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
                                {users.map(user => (
                                    <TableRow key={user.id} className={user.is_banned ? 'bg-destructive/10' : ''}>
                                        <TableCell>
                                            <div className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.username} />
                                                    <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium ${user.is_banned ? 'line-through' : ''}`}>{user.username}</span>
                                                    {user.badge && <Badge variant="secondary">{user.badge}</Badge>}
                                                    {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            N/A
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    onClick={() => handleToggleBan(user)}
                                                    disabled={isTogglingBan}
                                                >
                                                    {user.is_banned ? <User className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                </Button>
                                                <Button variant="outline" size="icon" disabled>
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
        </div>
    );
};

export default AdminPanel;
