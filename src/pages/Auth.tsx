import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
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
} from "@/components/ui/alert-dialog";
import { SignInForm } from '@/components/auth/SignInForm';
import { SignUpForm } from '@/components/auth/SignUpForm';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { toast } = useToast();

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email is required.",
      });
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);

    if (error) {
      console.error('Error sending password reset email:', error);
      toast({ variant: "destructive", title: "Error sending recovery email", description: "This can happen if your Site URL is not configured correctly in your Supabase dashboard's auth settings." });
    } else {
      toast({
        title: "Password reset link sent",
        description: "Please check your email to proceed. Don't forget to check your spam folder!",
      });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Tabs defaultValue="signin" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Sign in to your account to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignInForm />
              <div className="mt-4 text-center">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="link" className="px-0">Forgot your password?</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset your password</AlertDialogTitle>
                      <AlertDialogDescription>
                        Enter your email address and we will send you a link to reset your password.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePasswordReset} disabled={loading}>
                        {loading ? 'Sending...' : 'Send Reset Link'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>Create a new account.</CardDescription>
            </CardHeader>
            <CardContent>
              <SignUpForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Auth;
