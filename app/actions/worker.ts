"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleWorkerStatusAction(workerId: string, currentIsOnLeave: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Ensure caller is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: "Unauthorized. Admin access required." };
  }

  const newIsOnLeave = !currentIsOnLeave;
  const today = new Date().toISOString().split("T")[0];

  // We need to run this as an atomic-ish sequence.
  // 1. Update the workers table
  const { error: updateError } = await supabase
    .from("workers")
    .update({ is_on_leave: newIsOnLeave })
    .eq("profile_id", workerId);

  if (updateError) {
    return { error: updateError.message };
  }

  // 2. Manage the leave periods history
  if (newIsOnLeave) {
    // If turning ON leave, open a new leave period
    const { error: insertError } = await supabase
      .from("worker_leave_periods")
      .insert({
        worker_id: workerId,
        start_date: today,
        created_by: user.id,
      });
      
    if (insertError) {
      console.error("Failed to insert leave period", insertError);
    }
  } else {
    // If turning OFF leave (becoming active), close the most recent open leave period
    // Find the open one
    const { data: openLeave } = await supabase
      .from("worker_leave_periods")
      .select("id")
      .eq("worker_id", workerId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .single();

    if (openLeave) {
      await supabase
        .from("worker_leave_periods")
        .update({ end_date: today })
        .eq("id", openLeave.id);
    }
  }

  revalidatePath("/worker/dashboard");
  revalidatePath("/admin/workers");
  return { success: true };
}

export async function updateDailyAvailabilityAction(status: 'available' | 'leave') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  // 1. Enforce 07:00-07:30 IST window
  const now = new Date();
  const timeZone = 'Asia/Kolkata';
  
  // Get current time string in IST: "HH:mm:ss"
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(now);
  
  if (timeStr < '07:00:00' || timeStr >= '07:30:00') {
    return { error: "Availability can only be updated between 07:00 and 07:30 AM IST." };
  }

  // Get current date string in IST: "yyyy-MM-dd"
  const dateStr = new Intl.DateTimeFormat('fr-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);

  // Upsert into worker_daily_availability
  const { error } = await supabase
    .from('worker_daily_availability')
    .upsert({
      worker_id: user.id,
      availability_date: dateStr,
      status: status,
      updated_by: user.id
    }, {
      onConflict: 'worker_id, availability_date'
    });

  if (error) return { error: error.message };

  revalidatePath("/worker/dashboard");
  return { success: true };
}
