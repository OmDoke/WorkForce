"use client";

import { useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { verifyOtpAction } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const verifySchema = z.object({
  token: z.string().length(6, "OTP must be exactly 6 digits"),
});

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const type = (searchParams.get("type") as 'customer' | 'worker') || "customer";
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const form = useForm<z.infer<typeof verifySchema>>({
    resolver: zodResolver(verifySchema),
    defaultValues: { token: "" },
  });

  function onSubmit(data: z.infer<typeof verifySchema>) {
    setError("");
    startTransition(async () => {
      const res = await verifyOtpAction(phone, data.token, type);
      if (res.error) {
        setError(res.error);
      } else if (res.redirectUrl) {
        // If registering, pass phone so form can prepopulate
        if (res.redirectUrl === '/register' || res.redirectUrl === '/worker/register') {
          router.push(`${res.redirectUrl}?phone=${encodeURIComponent(phone)}`);
        } else {
          router.push(res.redirectUrl);
        }
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-brand-primary text-center">Verify OTP</CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit code sent to {phone}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="token"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>One Time Password</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" maxLength={6} {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full bg-brand-primary hover:bg-brand-primary/90" disabled={isPending}>
                {isPending ? "Verifying..." : "Verify & Continue"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Loading...</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
