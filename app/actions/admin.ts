"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function updateBookingStatusAction(bookingId: string, newStatus: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // Verify caller is an admin
  const { data: caller } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (caller?.role !== "admin") return { error: "Unauthorized" };

  // Update status
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: newStatus })
    .eq("id", bookingId);

  if (updateError) return { error: updateError.message };

  // Insert history
  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: newStatus,
    changed_by: user.id,
    note: `Status changed to ${newStatus}`,
  });

  revalidateTag("admin-dashboard-counts");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function assignWorkersAction(bookingId: string, workerIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  if (workerIds.length === 0) return { error: "No workers selected" };

  // Fetch booking details for SMS
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id,
      start_date,
      expected_duration_days,
      profiles!bookings_customer_id_fkey (full_name, phone, address),
      booking_work_types (work_types(name))
    `)
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };

  // Insert assignments
  const assignmentRows = workerIds.map((wId) => ({
    booking_id: bookingId,
    worker_id: wId,
    assigned_by: user.id,
  }));

  const { error: assignError } = await supabase
    .from("booking_assignments")
    .insert(assignmentRows);

  if (assignError) return { error: assignError.message };

  // Update booking status to 'assigned'
  await supabase
    .from("bookings")
    .update({ status: "assigned" })
    .eq("id", bookingId);

  await supabase.from("booking_status_history").insert({
    booking_id: bookingId,
    status: "assigned",
    changed_by: user.id,
    note: `Assigned ${workerIds.length} worker(s)`,
  });

  // Fake SMS notifications
  const workTypesStr = booking.booking_work_types.map((bwt: any) => bwt.work_types.name).join(", ");
  const profile = booking.profiles as unknown as { full_name: string; phone: string; address: string };
  const smsMessage = `WORK ASSIGNED: ${workTypesStr} at ${profile.address}. Starts ${booking.start_date} for ${booking.expected_duration_days} days. Farmer: ${profile.full_name} (${profile.phone})`;

  const logRows = workerIds.map((wId) => ({
    recipient_id: wId,
    booking_id: bookingId,
    channel: "sms",
    message: smsMessage,
    status: "sent"
  }));

  await supabase.from("notification_log").insert(logRows);

  // Print simulated SMS to terminal
  console.log("\n--- SIMULATED SMS DISPATCH ---");
  logRows.forEach((log) => {
    console.log(`To Worker ID ${log.recipient_id}:\n${log.message}\n`);
  });
  console.log("------------------------------\n");

  revalidateTag("admin-dashboard-counts");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function verifyWorkerAction(workerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 1. Update profile role to 'worker'
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role: "worker" })
    .eq("id", workerId);

  if (profileError) return { error: profileError.message };

  // 2. Update workers table with verification info
  const { error: workerError } = await supabase
    .from("workers")
    .update({
      verified_at: new Date().toISOString(),
      verified_by: user.id
    })
    .eq("profile_id", workerId);

  if (workerError) return { error: workerError.message };

  revalidateTag("admin-dashboard-counts");
  revalidatePath("/admin/workers");
  revalidatePath("/admin/workers/verify");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function adminPreAddWorkerAction(fullName: string, phone: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const formattedPhone = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;

  // Check if they already have a profile
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("phone", formattedPhone)
    .single();

  if (existingProfile) {
    if (existingProfile.role === "worker") {
      return { error: "This worker is already registered and active." };
    } else if (existingProfile.role === "new_worker") {
      // Auto-verify them since the admin explicitly added them
      await supabase.from("profiles").update({ role: "worker" }).eq("id", existingProfile.id);
      
      // Upsert into workers in case the row is completely missing for some reason
      await supabase.from("workers").upsert({
        profile_id: existingProfile.id,
        gender: "other", // Default fallback
        has_bike: false,
        is_on_leave: false,
        verified_at: new Date().toISOString(),
        verified_by: user.id
      }, { onConflict: "profile_id" });

      revalidatePath("/admin/workers");
      revalidatePath("/admin/workers/verify");
      return { success: true };
    } else {
      return { error: `User already exists with role: ${existingProfile.role}` };
    }
  }

  const { error } = await supabase.from("admin_pre_added_workers").insert({
    full_name: fullName,
    phone: formattedPhone,
    added_by: user.id
  });

  if (error) {
    if (error.code === '23505') {
      return { error: "This phone number is already pre-approved." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/workers");
  return { success: true };
}
