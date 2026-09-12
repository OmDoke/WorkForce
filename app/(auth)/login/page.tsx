"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendOtpAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  phone: z.string().min(10, "Enter a valid mobile number (e.g., +919876543210)"),
});

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "customer";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: "+91" },
  });

  function onSubmit(data: z.infer<typeof loginSchema>) {
    setError("");
    startTransition(async () => {
      const res = await sendOtpAction(data.phone);
      if (res.error) {
        setError(res.error);
      } else {
        router.push(`/verify-otp?phone=${encodeURIComponent(data.phone)}&type=${type}`);
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-brand-primary text-center">Login / Register</CardTitle>
          <CardDescription className="text-center">
            Enter your mobile number to get an OTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary/90" disabled={isPending}>
                {isPending ? "Sending OTP..." : "Send OTP"}
              </Button>
              <div className="text-center mt-4">
                <a href="/login?type=worker" className="text-sm text-brand-primary hover:underline">
                  Are you a worker? Login / Register here
                </a>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
