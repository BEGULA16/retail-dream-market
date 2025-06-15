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
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';

const Profile = () => {
  const { user, session, refreshAuth } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [isSeller, setIsSeller] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // State for admin panel easter egg
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [sequenceStartTime, setSequenceStartTime] = useState<number | null>(null);
  const [adminSequenceCompleted, setAdminSequenceCompleted] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const getProfile = async () => {
      if (!user) return;
      setLoading(true);
      try {
        let { data, error, status } = await supabase
          .from('profiles')
          .select(`username, avatar_url, is_seller`)
          .eq('id', user.id)
          .single();

        if (error && status === 406) {
          // Profile does not exist, create it.
          const emailUsername = user.email?.split('@')[0] || `user${Math.floor(Math.random() * 1000)}`;
          console.log(`Creating profile for user ${user.id} with username ${emailUsername}`);
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .insert({ 
              id: user.id, 
              username: emailUsername,
              updated_at: new Date().toISOString(),
              is_seller: false,
            })
            .select('username, avatar_url, is_seller')
            .single();

          if (insertError) {
            console.error('Error creating profile:', insertError);
            throw insertError;
          }
          console.log('Profile created successfully:', insertData);
          data = insertData;
        } else if (error) {
          throw error;
        }

        if (data) {
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url);
          setIsSeller(data.is_seller || false);
        }
      } catch (error: any)
{
        toast({ variant: 'destructive', title: 'Error fetching profile', description: error.message });
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [user, session, navigate, toast]);

  // useEffect for admin panel easter egg
  useEffect(() => {
    if (adminSequenceCompleted) {
      const timer = setTimeout(() => {
        setShowAdminButton(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [adminSequenceCompleted]);

  const handleAdminClick = () => {
    if (adminSequenceCompleted || showAdminButton) return;

    const now = Date.now();
    
    if (!sequenceStartTime) {
        setSequenceStartTime(now);
        setAdminClickCount(1);
        return;
    }

    if (now - (sequenceStartTime || 0) > 25000) {
        // Reset if time is up
        setSequenceStartTime(now);
        setAdminClickCount(1);
        toast({ title: "Sequence timed out", description: "Please try again.", variant: "destructive" });
        return;
    }

    const newCount = adminClickCount + 1;
    setAdminClickCount(newCount);

    if (newCount >= 20) { // 10 clicks on trigger, 10 on cancel
        setAdminSequenceCompleted(true);
        setSequenceStartTime(null);
        setAdminClickCount(0);
    }
  };

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();

    if (showAdminButton) {
      if (username.trim() === 'WenTirSOLana$') {
        toast({ title: 'Admin access granted!', description: 'Redirecting to admin panel...' });
        navigate('/admin-panel');
        return;
      } else {
        toast({ title: 'Incorrect Code', description: 'The admin sequence has been reset.', variant: 'destructive' });
        setShowAdminButton(false);
        setAdminSequenceCompleted(false);
        setAdminClickCount(0);
        setSequenceStartTime(null);
        return;
      }
    }
    
    if (!user || !username.trim()) return;

    if (user.email !== 'damiankehnan@proton.me') {
      const lastChanged = user.user_metadata?.username_last_changed_at;
      if (lastChanged) {
        const lastChangeDate = new Date(lastChanged);
        const now = new Date();
        const daysSinceChange = (now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceChange < 28) {
          const daysLeft = Math.ceil(28 - daysSinceChange);
          toast({
            variant: 'destructive',
            title: 'Username change not allowed',
            description: `You can change your username again in ${daysLeft} day(s).`
          });
          return;
        }
      }
    }

    setLoading(true);
    try {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        throw new Error("Your session has expired. Please log out and log in again.");
      }

      const updateData: { username: string; 'username_last_changed_at'?: string } = {
        username: username.trim(),
      };

      if (user.email !== 'damiankehnan@proton.me') {
        updateData['username_last_changed_at'] = new Date().toISOString();
      }

      // Update user_metadata in auth.users
      const { data: { user: updatedUser }, error: userError } = await supabase.auth.updateUser({
        data: updateData
      });

      if (userError) throw userError;

      // Update public.profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username: username.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (profileError) throw profileError;

      if (updatedUser?.user_metadata.username) {
        setUsername(updatedUser.user_metadata.username);
      }

      toast({ title: 'Username updated successfully!' });
    } catch (error: any) {
      console.error("Error updating username:", error);
      toast({
        variant: 'destructive',
        title: 'Error updating username',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.email) {
      toast({ variant: 'destructive', title: 'Error', description: 'User email not found.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Passwords do not match' });
      return;
    }
    if (!newPassword) {
      toast({ variant: 'destructive', title: 'Password cannot be empty' });
      return;
    }
    if (!currentPassword) {
      toast({ variant: 'destructive', title: 'Please enter your current password' });
      return;
    }

    setLoading(true);
    try {
      // Verify current password by trying to sign in.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Your current password is not correct.');
      }

      // If current password is correct, update to the new password.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated successfully!' });
      setCurrentPassword('');
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

  const handleSellerModeToggle = async (checked: boolean) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ is_seller: checked, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (profileError) throw profileError;

      const { error: userError } = await supabase.auth.updateUser({
        data: { is_seller: checked }
      });
      if (userError) throw userError;
      
      setIsSeller(checked);
      
      await refreshAuth();

      toast({ title: `Seller mode ${checked ? 'enabled' : 'disabled'}.` });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error updating seller status', description: error.message });
      setIsSeller(!checked);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (user?.email !== 'damiankehnan@proton.me') {
      toast({
        title: 'Feature In Development',
        description: 'Account deletion with a 7-day grace period is not fully implemented yet. Please check back later.',
        duration: 5000,
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        method: 'POST',
      });
      
      if (error) throw error;

      // Also check for errors returned in the data payload
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Account deleted successfully.' });
      await supabase.auth.signOut();
      navigate('/');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        variant: 'destructive',
        title: 'Error deleting account',
        description: `${error.message}. Please follow the instructions to configure the delete-user function.`,
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
      <Button asChild variant="ghost" className="mb-4">
        <Link to="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </Button>
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="username">Update Username</TabsTrigger>
          <TabsTrigger value="password">Change Password</TabsTrigger>
          <TabsTrigger value="seller">Seller Settings</TabsTrigger>
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
                <Input id="current-password" type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                <Input id="new-password" type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                <Input id="confirm-password" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="seller">
          <Card>
            <CardHeader>
              <CardTitle>Seller Mode</CardTitle>
              <CardDescription>Enable this to access the seller panel and list products for sale.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="seller-mode"
                  checked={isSeller}
                  onCheckedChange={handleSellerModeToggle}
                  disabled={loading}
                />
                <Label htmlFor="seller-mode">Enable Seller Mode</Label>
              </div>
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
                  <Button 
                    variant={showAdminButton ? 'default' : 'destructive'} 
                    className={showAdminButton ? 'bg-green-500 hover:bg-green-600' : ''}
                    disabled={loading}
                    onClick={handleAdminClick}
                  >
                    Delete Account
                  </Button>
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
                    <AlertDialogCancel onClick={handleAdminClick}>Cancel</AlertDialogCancel>
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
