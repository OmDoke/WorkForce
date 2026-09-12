import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, MapPin, Phone, User, Crop, ClipboardList, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import CancelBookingButton from "../CancelBookingButton";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "destructive",
  completed: "default",
  cancelled: "outline",
  rejected: "outline",
};

export default async function CustomerBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      *,
      profiles!bookings_customer_id_fkey (full_name, phone, address),
      crops (name),
      booking_work_types (
        work_types (name)
      ),
      booking_assignments (
        id,
        workers (
          profiles!workers_profile_id_fkey (id, full_name, phone)
        )
      ),
      booking_status_history (
        id,
        status,
        note,
        changed_at
      )
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching booking details:", error);
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-muted-foreground text-lg">Booking not found.</p>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCancellable = ["pending", "accepted"].includes(booking.status);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline" size="icon">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h2 className="text-2xl font-bold text-foreground">Booking Details</h2>
        </div>
        {isCancellable && (
          <CancelBookingButton bookingId={booking.id} />
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div className="space-y-1">
                <CardTitle>My Farm Work Request</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <MapPin className="w-4 h-4" />
                  {booking.profiles.address}
                </div>
              </div>
              <Badge 
                variant={STATUS_VARIANT[booking.status] ?? "secondary"}
                className="capitalize text-sm px-3 py-1"
              >
                {booking.status.replace('_', ' ')}
              </Badge>
            </CardHeader>
            <CardContent className="pt-6 grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Schedule</p>
                    <p className="text-muted-foreground">Starts: {format(new Date(booking.start_date), "PPP")}</p>
                    <p className="text-muted-foreground">Duration: {booking.expected_duration_days} days</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Crop className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Farm Details</p>
                    <p className="text-muted-foreground">{booking.crops.name} • {booking.farm_size_acres} acres</p>
                    <p className="text-muted-foreground">Requested Workers: {booking.estimated_workers_needed || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ClipboardList className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Work Types</p>
                    <p className="text-muted-foreground">
                      {booking.booking_work_types.map((bwt: any) => bwt.work_types.name).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {booking.booking_status_history
                  ?.sort((a: any, b: any) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime())
                  .map((history: any) => (
                  <div key={history.id} className="flex gap-4 items-start">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-brand-primary" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{history.status.replace('_', ' ')}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(history.changed_at), "PP p")}</p>
                      {history.note && (
                        <p className="text-sm text-muted-foreground mt-1 bg-muted/50 p-2 rounded-md italic">
                          {history.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Assigned Workers */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Workers</CardTitle>
            </CardHeader>
            <CardContent>
              {(!booking.booking_assignments || booking.booking_assignments.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">
                  Admin has not assigned any workers yet. You will be notified once workers are assigned.
                </p>
              ) : (
                <ul className="space-y-3">
                  {booking.booking_assignments.map((assignment: any) => (
                    <li key={assignment.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
                      <div className="w-8 h-8 rounded-full bg-brand-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-brand-primary" />
                      </div>
                      <div>
                        <span className="font-medium text-sm block">
                          {assignment.workers?.profiles?.full_name ?? "Unknown Worker"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
