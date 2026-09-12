"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completePreAddedWorkerAction } from "@/app/actions/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  address: z.string().min(5, "Home address is required"),
  gender: z.enum(["male", "female", "other"]),
  hasBike: z.boolean(),
});

export default function CompleteProfileForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hasBike: false,
    }
  });

  const hasBike = watch("hasBike");

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    setError("");
    startTransition(async () => {
      const res = await completePreAddedWorkerAction(data);
      if (res.error) {
        setError(res.error);
      } else if (res.redirectUrl) {
        router.push(res.redirectUrl);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Home Address</Label>
        <Input id="address" {...register("address")} placeholder="123 Farm Lane" />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="gender">Gender</Label>
        <Select onValueChange={(val) => setValue("gender", val as any)}>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
      </div>

      <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
        <Checkbox
          id="hasBike"
          checked={hasBike}
          onCheckedChange={(checked) => setValue("hasBike", checked === true)}
          disabled={isPending}
        />
        <div className="space-y-1 leading-none">
          <Label htmlFor="hasBike">I own a bike</Label>
          <p className="text-sm text-muted-foreground">
            This helps admins assign you to jobs that require transportation.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="bg-brand-primary hover:bg-brand-primary/90 text-white w-full">
        {isPending ? "Saving..." : "Complete Profile"}
      </Button>
    </form>
  );
}
