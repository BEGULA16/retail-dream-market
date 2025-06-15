import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "./PasswordInput";
import { useState, useEffect, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const getLoginAttemptData = () => {
  const data = localStorage.getItem('loginAttempts');
  return data ? JSON.parse(data) : {};
};

const setLoginAttemptData = (data: any) => {
  localStorage.setItem('loginAttempts', JSON.stringify(data));
};

export const SignInForm = () => {
  const [loading, setLoading] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const emailValue = form.watch("email");

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
    if (!emailValue) {
      setLockoutTimeLeft(0);
      return;
    }
    const attempts = getLoginAttemptData();
    const userData = attempts[emailValue];
    if (userData && userData.lockUntil && userData.lockUntil > Date.now()) {
      const timeLeft = Math.ceil((userData.lockUntil - Date.now()) / 1000);
      setLockoutTimeLeft(timeLeft);
    } else {
      setLockoutTimeLeft(0);
    }
  }, [emailValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!captchaToken) {
      toast({
        variant: "destructive",
        title: "CAPTCHA required",
        description: "Please complete the CAPTCHA challenge.",
      });
      return;
    }
    setLoading(true);

    const attempts = getLoginAttemptData();
    const userData = attempts[values.email] || { count: 0, lockUntil: null };

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
    
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
      options: {
        captchaToken,
      },
    });

    if (error) {
      const newCount = userData.count + 1;
      const updatedUserData = { count: newCount, lockUntil: userData.lockUntil };
      let toastDescription = "Incorrect email or password.";
      let lockDuration = 0;

      if (newCount === 3) {
        lockDuration = 60;
        toastDescription = "3 failed attempts. Please try again in 60 seconds.";
      } else if (newCount === 5) {
        lockDuration = 100;
        toastDescription = "5 failed attempts. Please try again in 100 seconds.";
      } else if (newCount > 5) {
        lockDuration = 100;
        toastDescription = `Login failed. Please try again in 100 seconds.`;
      }
      
      if (lockDuration > 0) {
        updatedUserData.lockUntil = Date.now() + lockDuration * 1000;
        setLockoutTimeLeft(lockDuration);
      }

      setLoginAttemptData({ ...attempts, [values.email]: updatedUserData });
      toast({ variant: "destructive", title: "Error signing in", description: toastDescription });
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } else {
      const attempts = getLoginAttemptData();
      delete attempts[values.email];
      setLoginAttemptData(attempts);
      setLockoutTimeLeft(0);
      toast({ title: "Signed in successfully!" });
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      navigate('/');
    }
    
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Email</FormLabel>
              <FormControl>
                <Input placeholder="Email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="Password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <HCaptcha
          sitekey="YOUR_HCAPTCHA_SITE_KEY"
          onVerify={setCaptchaToken}
          onError={() => toast({ variant: "destructive", title: "CAPTCHA error", description: "Something went wrong. Please try again."})}
          onExpire={() => setCaptchaToken(null)}
          ref={captchaRef}
        />
        <Button type="submit" className="w-full" disabled={loading || lockoutTimeLeft > 0 || !captchaToken}>
          {lockoutTimeLeft > 0 ? `Try again in ${lockoutTimeLeft}s` : loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </Form>
  );
};
