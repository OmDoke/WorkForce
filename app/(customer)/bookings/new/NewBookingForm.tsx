"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { createBookingAction } from "@/app/actions/booking";
import { Card, CardContent } from "@/components/ui/card";

const bookingFormSchema = z.object({
  farmSizeAcres: z.coerce.number().positive("Farm size must be greater than 0"),
  workTypeIds: z.array(z.string()).min(1, "Select at least one work type"),
  startDate: z.date({
    message: "A start date is required.",
  }),
  expectedDurationDays: z.coerce.number().int().positive("Duration must be at least 1 day"),
  estimatedWorkersNeeded: z.coerce.number().int().positive().optional().or(z.literal(0).transform(() => undefined)),
});

type NewBookingFormProps = {
  crop: { id: string; name: string };
  workTypes: { id: string; name: string }[];
};

export default function NewBookingForm({ crop, workTypes }: NewBookingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const form = useForm<z.infer<typeof bookingFormSchema>>({
    resolver: zodResolver(bookingFormSchema) as any,
    defaultValues: {
      farmSizeAcres: "" as any,
      workTypeIds: [],
      expectedDurationDays: "" as any,
      estimatedWorkersNeeded: "" as any,
    },
  });

  function onSubmit(data: z.infer<typeof bookingFormSchema>) {
    setError("");
    startTransition(async () => {
      const res = await createBookingAction({
        farmSizeAcres: data.farmSizeAcres,
        cropId: crop.id,
        workTypeIds: data.workTypeIds,
        startDate: data.startDate.toISOString().split("T")[0],
        expectedDurationDays: data.expectedDurationDays,
        estimatedWorkersNeeded: data.estimatedWorkersNeeded,
      });

      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        router.push("/dashboard");
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormItem>
                <FormLabel>Crop</FormLabel>
                <FormControl>
                  <Input value={crop.name} disabled />
                </FormControl>
                <FormDescription>Currently locked to {crop.name} for MVP.</FormDescription>
              </FormItem>

              <FormField
                control={form.control}
                name="farmSizeAcres"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Farm Size (Acres)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="e.g. 2.5" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workTypeIds"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Work Types</FormLabel>
                    <FormDescription>
                      Select all tasks required for this booking.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {workTypes.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="workTypeIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item.id
                                          )
                                        )
                                  }}
                                  disabled={isPending}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <FormControl>
                        <PopoverTrigger render={
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isPending}
                          />
                        }>
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </PopoverTrigger>
                      </FormControl>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedDurationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Duration (Days)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 3" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="estimatedWorkersNeeded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Workers Needed (Optional)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 5" {...field} disabled={isPending} />
                  </FormControl>
                  <FormDescription>
                    Admin makes the final call, but your estimate helps with planning.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
            
            <div className="flex justify-end space-x-4">
              <Button variant="outline" type="button" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-brand-primary text-white hover:bg-brand-primary/90">
                {isPending ? "Submitting..." : "Submit Booking"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
