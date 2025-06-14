import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "./PasswordInput";
import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const allowedDomains = ['proton.me', 'protonmail.com', 'gmail.com', 'yahoo.com', 'google.com'];

const formSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters." }),
  email: z.string().email({ message: "Invalid email address." }).refine(email => {
    const domain = email.split('@')[1];
    return !!domain && allowedDomains.includes(domain.toLowerCase());
  }, {
    message: "Please use an email from a trusted provider like Proton, Google, or Yahoo."
  }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

const checkUsernameExists = async (username: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .single();
  if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
    throw error;
  }
  return !!data;
};

export const SignUpForm = () => {
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

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

    const usernameExists = await checkUsernameExists(values.username);
    if (usernameExists) {
        form.setError("username", {
            type: "manual",
            message: "Username is already taken. Please choose another one.",
        });
        setLoading(false);
        return;
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          username: values.username,
        },
        captchaToken,
      },
    });

    if (error) {
      toast({ variant: "destructive", title: "Error signing up", description: error.message });
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    } else {
      toast({ title: "Success!", description: "Check your email for the confirmation link. Don't forget to check your spam folder!" });
      form.reset();
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Username</FormLabel>
              <FormControl>
                <Input placeholder="Username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
          sitekey="97c2e5a0-0bdc-4d72-8612-7f90f4726cd6"
          onVerify={setCaptchaToken}
          onError={() => toast({ variant: "destructive", title: "CAPTCHA error", description: "Something went wrong. Please try again."})}
          onExpire={() => setCaptchaToken(null)}
          ref={captchaRef}
        />
        <Button type="submit" className="w-full" disabled={loading || !captchaToken}>
          {loading ? 'Signing up...' : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
};
