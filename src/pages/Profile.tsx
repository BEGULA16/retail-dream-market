import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const Profile = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const getProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error, status } = await supabase
          .from('profiles')
          .select(`username, avatar_url`)
          .eq('id', user.id)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (data) {
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url);
        }
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error fetching profile', description: error.message });
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [user, session, navigate, toast]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !username.trim()) return;

    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({ username }).eq('id', user.id);
      if (profileError) throw profileError;

      const { error: authError } = await supabase.auth.updateUser({ data: { username } });
      if (authError) throw authError;

      toast({ title: 'Username updated successfully!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating username', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (!newPassword) {
      toast({ variant: 'destructive', title: 'Password cannot be empty' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated successfully!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating password', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      
      setAvatarUrl(publicUrl);
      toast({ title: 'Avatar updated!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error uploading avatar', description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        method: 'POST',
      });
      if (error) throw error;

      toast({ title: 'Account deleted successfully.' });
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error deleting account',
        description: error.message || "Please ensure the 'delete-user' Edge Function is set up correctly in Supabase.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => (name ? name.charAt(0).toUpperCase() : '');

  if (loading && !username) {
    return <div className="container mx-auto max-w-2xl py-8">Loading profile...</div>;
  }
  
  if (!session) return null;

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="mb-8">
        <CardHeader className="flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-6">
          <div className="relative">
            <Avatar className="h-20 w-20 text-3xl">
              <AvatarImage src={avatarUrl ?? undefined} alt={username} />
              <AvatarFallback>{getInitials(username || user?.email || 'U')}</AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8"
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploading}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Change avatar</span>
            </Button>
            <Input
              ref={avatarInputRef}
              type="file"
              className="hidden"
              onChange={handleAvatarUpload}
              accept="image/*"
              disabled={uploading}
            />
          </div>
          <div className="text-center sm:text-left">
            <CardTitle className="text-2xl">{username || 'User'}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs defaultValue="username">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="username">Update Username</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="delete">Delete Account</TabsTrigger>
        </TabsList>
        <TabsContent value="username">
          <Card>
            <CardHeader>
              <CardTitle>Username</CardTitle>
              <CardDescription>This is your public display name.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Update your password here.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <Input id="new-password" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <Input id="confirm-password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="delete">
          <Card>
            <CardHeader>
              <CardTitle>Delete Account</CardTitle>
              <CardDescription>
                Permanently delete your account and all of your content. This action is not reversible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={loading}>Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your account
                      and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={loading}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loading ? 'Deleting...' : 'Continue'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;
