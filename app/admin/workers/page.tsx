import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { previousFriday, isFriday, startOfDay, format } from "date-fns";
import WorkerStatusToggle from "./WorkerStatusToggle";

export default async function AdminWorkersPage() {
  const supabase = await createClient();

  const { data: workers, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      workers!workers_profile_id_fkey!inner(is_on_leave, has_bike)
    `)
    .eq("role", "worker")
    .order("full_name");

  if (error) {
    console.error("Error fetching workers:", error);
  }

  // Determine current pay week start (Friday)
  const today = startOfDay(new Date());
  const weekStart = isFriday(today) ? today : previousFriday(today);
  const formattedWeekStart = format(weekStart, 'yyyy-MM-dd');

  // Fetch days worked for ALL workers in a single RPC call (fixes N+1 query)
  const { data: payrollData } = await supabase.rpc("get_all_workers_days_worked", {
    p_week_start: formattedWeekStart
  });

  // Build a lookup map: worker_id -> days_worked
  const payrollMap = new Map<string, number>(
    (payrollData || []).map((row: { worker_id: string; days_worked: number }) => [
      row.worker_id,
      row.days_worked,
    ])
  );

  const workersWithPayroll = (workers || []).map((w: any) => ({
    ...w,
    days_worked: payrollMap.get(w.id) ?? 0,
  }));

  // Also check if there are pending workers
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact" })
    .eq("role", "new_worker");

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Workers Directory</h2>
        <div className="flex gap-4">
          {(pendingCount ?? 0) > 0 && (
            <Link href="/admin/workers/verify">
              <Button variant="outline" className="text-amber-600 border-amber-600 hover:bg-amber-50">
                <UserCheck className="w-4 h-4 mr-2" />
                {pendingCount} Pending Verification
              </Button>
            </Link>
          )}
          <Link href="/admin/workers/new">
            <Button className="bg-brand-primary hover:bg-brand-primary/90 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Worker
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="bg-muted p-4 rounded-lg flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Current Pay Period</h3>
          <p className="text-sm text-muted-foreground">
            Started Friday, {format(weekStart, 'MMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {workersWithPayroll.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No workers found.
            </CardContent>
          </Card>
        ) : (
          workersWithPayroll.map((worker: any) => (
            <Card key={worker.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">{worker.full_name}</span>
                    <Badge variant={worker.workers[0]?.has_bike ? "default" : "secondary"}>
                      {worker.workers[0]?.has_bike ? "Has Bike" : "No Bike"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Phone: {worker.phone}
                  </div>
                  <div className="font-medium text-brand-primary pt-1">
                    Days worked this week: {worker.days_worked}
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-0">
                  <WorkerStatusToggle 
                    workerId={worker.id} 
                    initialIsOnLeave={worker.workers[0]?.is_on_leave || false} 
                  />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
