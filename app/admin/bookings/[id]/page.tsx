import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, MapPin, Phone, User, Crop, ClipboardList } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";
import BookingActions from "./BookingActions";
import WorkerAssignment from "./WorkerAssignment";
import BookingProgressActions from "./BookingProgressActions";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "destructive",
  completed: "default",
  cancelled: "outline",
  rejected: "outline",
};

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
        worker_id,
        workers (
          profiles!workers_profile_id_fkey (id, full_name)
        )
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
        <Link href="/admin/bookings">
          <Button variant="outline">Back to Bookings</Button>
        </Link>
      </div>
    );
  }

  // If status is accepted or assigned, fetch available workers for assignment
  let availableWorkers: any[] = [];
  if (booking.status === 'accepted' || booking.status === 'assigned') {
    const { data: allWorkers } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        workers!workers_profile_id_fkey!inner(has_bike, is_on_leave)
      `)
      .eq("role", "worker")
      .eq("workers.is_on_leave", false);

    // Filter out workers already assigned to active jobs
    const { data: activeAssignments } = await supabase
      .from("booking_assignments")
      .select("worker_id, bookings!inner(status)")
      .in("bookings.status", ["assigned", "in_progress"]);
      
    const busyWorkerIds = new Set((activeAssignments || []).map((a: any) => a.worker_id));
    
    // Filter out workers already assigned to THIS booking (null-safe access)
    const alreadyAssignedToThis = new Set(
      (booking.booking_assignments || [])
        .map((a: any) => a.workers?.profiles?.id)
        .filter(Boolean)
    );

    // Filter out workers on daily leave for any date overlapping this booking
    const startDate = new Date(booking.start_date);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + booking.expected_duration_days - 1);
    
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    const { data: leaveRecords } = await supabase
      .from("worker_daily_availability")
      .select("worker_id")
      .eq("status", "leave")
      .gte("availability_date", startStr)
      .lte("availability_date", endStr);
      
    const workersOnDailyLeave = new Set((leaveRecords || []).map((r: any) => r.worker_id));

    availableWorkers = (allWorkers || []).filter((w: any) => 
      !busyWorkerIds.has(w.id) && 
      !alreadyAssignedToThis.has(w.id) &&
      !workersOnDailyLeave.has(w.id)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/bookings">
          <Button variant="outline" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-foreground">Booking Details</h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div className="space-y-1">
                <CardTitle>{(Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles)?.full_name}&apos;s Farm</CardTitle>
                <div className="flex items-center text-sm text-muted-foreground gap-2">
                  <MapPin className="w-4 h-4" />
                  {(Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles)?.address}
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
                <div className="flex gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Contact</p>
                    <p className="text-muted-foreground">{(Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles)?.phone}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Crop className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Farm Details</p>
                    <p className="text-muted-foreground">{(Array.isArray(booking.crops) ? booking.crops[0] : booking.crops)?.name} • {booking.farm_size_acres} acres</p>
                    <p className="text-muted-foreground">Est. Workers Needed: {booking.estimated_workers_needed || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ClipboardList className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Work Types</p>
                    <p className="text-muted-foreground">
                      {(booking.booking_work_types || []).map((bwt: any) => (Array.isArray(bwt.work_types) ? bwt.work_types[0] : bwt.work_types)?.name).join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accept/Reject for pending bookings */}
          {booking.status === 'pending' && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-amber-900">Review Required</h3>
                  <p className="text-sm text-amber-700">Accept this booking to unlock worker assignment.</p>
                </div>
                <BookingActions bookingId={booking.id} status={booking.status} />
              </CardContent>
            </Card>
          )}

          {/* Worker assignment for accepted/assigned bookings */}
          {(booking.status === 'accepted' || booking.status === 'assigned') && (
            <WorkerAssignment bookingId={booking.id} availableWorkers={availableWorkers} />
          )}

          {/* Progress controls for assigned and in_progress bookings */}
          {(booking.status === 'assigned' || booking.status === 'in_progress') && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardContent className="pt-6 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">Update Progress</h3>
                  <p className="text-sm text-blue-700">Move this booking to the next stage.</p>
                </div>
                <BookingProgressActions bookingId={booking.id} status={booking.status as 'assigned' | 'in_progress'} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Assigned Workers */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Workers</CardTitle>
            </CardHeader>
            <CardContent>
              {(!booking.booking_assignments || booking.booking_assignments.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">No workers assigned yet.</p>
              ) : (
                <ul className="space-y-3">
                  {booking.booking_assignments.map((assignment: any) => (
                    <li key={assignment.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50 border">
                      <User className="w-4 h-4 text-brand-primary" />
                      <span className="font-medium text-sm">
                        {assignment.workers?.profiles?.full_name ?? "Unknown Worker"}
                      </span>
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
