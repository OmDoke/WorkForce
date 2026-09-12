import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Calendar, Plus, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import CancelBookingButton from "./CancelBookingButton";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  completed: "default",
  cancelled: "destructive",
  rejected: "destructive",
};

export default async function BookingHistory() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch ALL bookings for customer
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      start_date,
      expected_duration_days,
      status,
      farm_size_acres,
      crops (name),
      booking_work_types (
        work_types (name)
      )
    `)
    .order("start_date", { ascending: false });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Booking History</h2>
        <Link href="/bookings/new">
          <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </Link>
      </div>
      
      {(!bookings || bookings.length === 0) ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              You have no booking history.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking: any) => {
            const isCancellable = ["pending", "accepted"].includes(booking.status);
            return (
              <Link href={`/bookings/${booking.id}`} key={booking.id} className="block transition-transform hover:scale-[1.01]">
                <Card className="overflow-hidden hover:border-brand-primary/50 transition-colors">
                  <div className="border-b bg-muted/50 p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">
                        Start: {format(new Date(booking.start_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={STATUS_BADGE[booking.status] ?? "secondary"}
                        className="capitalize"
                      >
                        {booking.status.replace('_', ' ')}
                      </Badge>
                      {isCancellable && (
                        <CancelBookingButton bookingId={booking.id} />
                      )}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Crop &amp; Size</p>
                        <p className="font-medium">
                          {booking.crops.name} • {booking.farm_size_acres} acres
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Work Types</p>
                        <p className="font-medium">
                          {booking.booking_work_types.map((bwt: any) => bwt.work_types.name).join(", ")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{booking.expected_duration_days} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
