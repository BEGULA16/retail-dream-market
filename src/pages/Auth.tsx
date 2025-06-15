
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  const getLoginAttemptData = () => {
    const data = localStorage.getItem('loginAttempts');
    return data ? JSON.parse(data) : {};
  };

  const setLoginAttemptData = (data: any) => {
    localStorage.setItem('loginAttempts', JSON.stringify(data));
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutTimeLeft > 0) {
      timer = setInterval(() => {
        setLockoutTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  useEffect(() => {
    if (!email) {
      setLockoutTimeLeft(0);
      return;
    }
    const attempts = getLoginAttemptData();
    const userData = attempts[email];
    if (userData && userData.lockUntil && userData.lockUntil > Date.now()) {
      const timeLeft = Math.ceil((userData.lockUntil - Date.now()) / 1000);
      setLockoutTimeLeft(timeLeft);
    } else {
      setLockoutTimeLeft(0);
    }
  }, [email]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const attempts = getLoginAttemptData();
    const userData = attempts[email] || { count: 0, lockUntil: null };

    if (userData.lockUntil && userData.lockUntil > Date.now()) {
      const timeLeft = Math.ceil((userData.lockUntil - Date.now()) / 1000);
      setLockoutTimeLeft(timeLeft);
      toast({
        variant: "destructive",
        title: "Too many login attempts",
        description: `Please try again in ${timeLeft} seconds.`,
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const newCount = userData.count + 1;
      const updatedUserData = { count: newCount, lockUntil: userData.lockUntil };
      let toastDescription = "Incorrect email or password.";
      let lockDuration = 0;

      if (newCount === 3) {
        lockDuration = 60; // 60 seconds
        toastDescription = "3 failed attempts. Please try again in 60 seconds.";
      } else if (newCount === 5) {
        lockDuration = 100; // 100 seconds
        toastDescription = "5 failed attempts. Please try again in 100 seconds.";
      } else if (newCount > 5) {
        lockDuration = 100; // 100 seconds for subsequent failures
        toastDescription = `Login failed. Please try again in 100 seconds.`;
      }
      
      if (lockDuration > 0) {
        updatedUserData.lockUntil = Date.now() + lockDuration * 1000;
        setLockoutTimeLeft(lockDuration);
      }

      setLoginAttemptData({ ...attempts, [email]: updatedUserData });
      toast({ variant: "destructive", title: "Error signing in", description: toastDescription });
    } else {
      const attempts = getLoginAttemptData();
      delete attempts[email];
      setLoginAttemptData(attempts);
      setLockoutTimeLeft(0);
      toast({ title: "Signed in successfully!" });
      navigate('/');
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });
    if (error) {
      toast({ variant: "destructive", title: "Error signing up", description: error.message });
    } else {
      toast({ title: "Success!", description: "Check your email for the confirmation link." });
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
              <form onSubmit={handleLogin} className="space-y-4">
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={loading || lockoutTimeLeft > 0}>
                  {lockoutTimeLeft > 0 ? `Try again in ${lockoutTimeLeft}s` : loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
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
              <form onSubmit={handleSignup} className="space-y-4">
                <Input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing up...' : 'Sign Up'}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Auth;
