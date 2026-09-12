"use server";

import { createClient } from "@/utils/supabase/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const bookingSchema = z.object({
  farmSizeAcres: z.number().positive(),
  cropId: z.string().uuid(),
  workTypeIds: z.array(z.string().uuid()).min(1),
  startDate: z.string(), // ISO date string
  expectedDurationDays: z.number().int().positive(),
  estimatedWorkersNeeded: z.number().int().positive().optional(),
});

export async function createBookingAction(data: z.infer<typeof bookingSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const validated = bookingSchema.safeParse(data);
  if (!validated.success) {
    return { error: "Invalid form data" };
  }

  const {
    farmSizeAcres,
    cropId,
    workTypeIds,
    startDate,
    expectedDurationDays,
    estimatedWorkersNeeded,
  } = validated.data;

  // Insert the booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      customer_id: user.id,
      crop_id: cropId,
      farm_size_acres: farmSizeAcres,
      start_date: startDate,
      expected_duration_days: expectedDurationDays,
      estimated_workers_needed: estimatedWorkersNeeded || null,
      status: "pending",
    })
    .select()
    .single();

  if (bookingError) {
    return { error: bookingError.message };
  }

  // Insert the work types mapping
  const workTypeRows = workTypeIds.map((typeId) => ({
    booking_id: booking.id,
    work_type_id: typeId,
  }));

  const { error: mappingError } = await supabase
    .from("booking_work_types")
    .insert(workTypeRows);

  if (mappingError) {
    return { error: mappingError.message };
  }

  // Insert status history
  await supabase.from("booking_status_history").insert({
    booking_id: booking.id,
    status: "pending",
    changed_by: user.id,
    note: "Booking created",
  });

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  return { success: true, bookingId: booking.id };
}

export async function cancelBookingAction(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify the booking belongs to this customer and is still cancellable
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, customer_id")
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .single();

  if (!booking) return { error: "Booking not found." };
  if (!["pending", "accepted"].includes(booking.status)) {
    return { error: "Only pending or accepted bookings can be cancelled." };
  }

  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (updateError) return { error: updateError.message };

  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: "cancelled",
    changed_by: user.id,
    note: "Cancelled by customer",
  });

  revalidatePath("/dashboard");
  revalidatePath("/bookings");
  return { success: true };
}

