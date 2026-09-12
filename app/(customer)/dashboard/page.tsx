import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Calendar, Plus, Clock } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default async function CustomerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch active bookings (not completed, not cancelled)
  const { data: activeBookings } = await supabase
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
    .in("status", ["pending", "accepted", "assigned", "in_progress"])
    .order("start_date", { ascending: true });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Your Active Bookings</h2>
        <Link href="/bookings/new">
          <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>
        </Link>
      </div>
      
      {(!activeBookings || activeBookings.length === 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>Book a new work slot</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don't have any upcoming or ongoing bookings. Ready to request labor for your farm?
            </p>
            <Link href="/bookings/new">
              <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
                Add New Booking
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {activeBookings.map((booking: any) => (
            <Link href={`/bookings/${booking.id}`} key={booking.id} className="block transition-transform hover:scale-[1.01]">
              <Card className="overflow-hidden border-brand-primary/20 hover:border-brand-primary/50 transition-colors">
                <div className="border-b bg-muted/50 p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-primary" />
                    <span className="font-medium">
                      Start: {format(new Date(booking.start_date), "MMM d, yyyy")}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({booking.expected_duration_days} days)
                    </span>
                  </div>
                  <Badge 
                    variant={booking.status === 'in_progress' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </div>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Crop & Size</p>
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
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
