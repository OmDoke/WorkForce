"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminPreAddWorkerAction } from "@/app/actions/admin";

const formSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Phone number is required"),
});

export default function AddWorkerForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setError("");
    setSuccess("");
    startTransition(async () => {
      const res = await adminPreAddWorkerAction(data.fullName, data.phone);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(`Worker ${data.fullName} has been pre-approved! When they log in, they will be active immediately.`);
        reset();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input id="fullName" {...register("fullName")} placeholder="e.g. Ramesh Kumar" />
        {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Mobile Number</Label>
        <Input id="phone" {...register("phone")} placeholder="e.g. 9999999999" />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</p>}
      {success && <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded border border-emerald-200">{success}</p>}

      <Button type="submit" disabled={isPending} className="bg-brand-primary hover:bg-brand-primary/90 text-white w-full">
        {isPending ? "Adding..." : "Add Worker"}
      </Button>
    </form>
  );
}
