import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { format } from "date-fns";

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      id,
      start_date,
      expected_duration_days,
      status,
      farm_size_acres,
      profiles!bookings_customer_id_fkey (full_name),
      crops (name),
      booking_work_types (
        work_types (name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error || !bookings || bookings.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">All Bookings</h2>
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground flex flex-col gap-2">
            <span>No bookings found.</span>
            {error && <span className="text-destructive text-sm font-mono">Error: {error.message || JSON.stringify(error)}</span>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">All Bookings</h2>
      
      <div className="grid gap-4">
        {bookings.map((booking: any) => (
          <Card key={booking.id} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{(Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles)?.full_name}'s Farm</span>
                  <Badge 
                    variant={
                      booking.status === 'pending' ? 'destructive' :
                      booking.status === 'completed' ? 'default' : 
                      booking.status === 'cancelled' || booking.status === 'rejected' ? 'outline' :
                      'secondary'
                    }
                    className="capitalize"
                  >
                    {booking.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(booking.start_date), "MMM d, yyyy")}</span>
                  <span>•</span>
                  <span>{booking.expected_duration_days} days</span>
                  <span>•</span>
                  <span>{booking.farm_size_acres} acres</span>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0">
                <Link href={`/admin/bookings/${booking.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
