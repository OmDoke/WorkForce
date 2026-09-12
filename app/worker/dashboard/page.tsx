import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import DailyAvailabilityToggle from "./DailyAvailabilityToggle";
import { format } from "date-fns";

export default async function WorkerDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch worker profile
  const { data: profile } = await supabase
    .from("profiles")
    .select(`full_name, role`)
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "worker") {
    redirect("/worker/pending-verification");
  }

  // Get current date string in IST
  const timeZone = 'Asia/Kolkata';
  const todayStr = new Intl.DateTimeFormat('fr-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

  // Fetch today's availability
  const { data: dailyRecord } = await supabase
    .from("worker_daily_availability")
    .select("status")
    .eq("worker_id", user.id)
    .eq("availability_date", todayStr)
    .single();

  const currentStatus = dailyRecord?.status || 'available';

  // Fetch ALL assignments with booking details (filter in JS — Supabase .in() on joined columns is not supported)
  const { data: allAssignments } = await supabase
    .from("booking_assignments")
    .select(`
      bookings (
        id,
        start_date,
        expected_duration_days,
        farm_size_acres,
        status,
        profiles!bookings_customer_id_fkey (full_name, phone, address),
        booking_work_types (
          work_types (name)
        )
      )
    `)
    .eq("worker_id", user.id)
    .order("bookings(start_date)", { ascending: false });

  // Filter in JavaScript — because Supabase JS does not support .in() on nested join columns
  const activeJobs = (allAssignments || []).filter(
    (a: any) => a.bookings !== null && ['assigned', 'in_progress'].includes(a.bookings.status)
  );

  const completedJobs = (allAssignments || []).filter(
    (a: any) => a.bookings !== null && a.bookings.status === 'completed'
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 flex items-center justify-between px-8 border-b bg-card">
        <h1 className="text-xl font-bold text-brand-primary">Workforce</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Worker Portal</span>
          <Link href="/logout">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </Link>
        </div>
      </header>

      <main className="p-8 max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome, {profile.full_name}</h2>
            <p className="text-muted-foreground">Manage your availability and view upcoming jobs.</p>
          </div>
          
          <DailyAvailabilityToggle 
            initialStatus={currentStatus} 
            todayStr={todayStr}
          />
        </div>
        
        {/* Active Jobs */}
        <section>
          <h3 className="text-xl font-semibold mb-4">
            Your Active Jobs
            {activeJobs.length > 0 && (
              <Badge className="ml-2 bg-brand-primary text-white">{activeJobs.length}</Badge>
            )}
          </h3>
          {activeJobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground text-center">
                  You don&apos;t have any active job assignments right now.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {activeJobs.map(({ bookings: job }: any) => (
                <Card key={job.id} className="overflow-hidden border-brand-primary/20">
                  <div className="border-b bg-muted/50 p-4 flex justify-between items-center">
                    <div>
                      <span className="font-semibold block text-lg">{job.profiles.full_name}&apos;s Farm</span>
                      <span className="text-sm text-muted-foreground">
                        Start: {format(new Date(job.start_date), "MMM d, yyyy")} • {job.expected_duration_days} days
                      </span>
                    </div>
                    <Badge variant={job.status === 'in_progress' ? 'default' : 'secondary'} className="capitalize">
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Farm Size</p>
                        <p className="font-medium">{job.farm_size_acres} acres</p>
                      </div>
                      <div className="flex gap-2 items-start">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-medium">{job.profiles.address}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Farmer Contact</p>
                          <p className="font-medium">{job.profiles.phone}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Work Types</p>
                        <p className="font-medium">
                          {job.booking_work_types?.map((bwt: any) => bwt.work_types?.name).filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Job History */}
        {completedJobs.length > 0 && (
          <section>
            <h3 className="text-xl font-semibold mb-4 text-muted-foreground">
              Completed Jobs ({completedJobs.length})
            </h3>
            <div className="grid gap-4">
              {completedJobs.map(({ bookings: job }: any) => (
                <Card key={job.id} className="overflow-hidden opacity-75">
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <span className="font-medium">{job.profiles.full_name}&apos;s Farm</span>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(job.start_date), "MMM d, yyyy")} • {job.expected_duration_days} days • {job.farm_size_acres} acres
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize text-emerald-700 border-emerald-300">
                      Completed
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
