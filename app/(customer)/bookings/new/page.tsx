import { createClient } from "@/utils/supabase/server";
import NewBookingForm from "./NewBookingForm";
import { redirect } from "next/navigation";

export default async function NewBookingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the default crop (Grapes)
  const { data: crop } = await supabase
    .from("crops")
    .select("id, name")
    .eq("name", "Grapes")
    .eq("is_active", true)
    .single();

  if (!crop) {
    return <div>Error: Default crop not found in database.</div>;
  }

  // Fetch all active work types for this crop
  const { data: workTypes } = await supabase
    .from("work_types")
    .select("id, name")
    .eq("crop_id", crop.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Booking</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Submit a new labor request for your farm.
          </p>
        </div>

        <NewBookingForm crop={crop} workTypes={workTypes || []} />
      </div>
    </div>
  );
}
