import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import VerifyAction from "./VerifyAction";

export default async function VerifyWorkersPage() {
  const supabase = await createClient();

  const { data: pendingWorkers, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      phone,
      address,
      workers!workers_profile_id_fkey!inner(gender)
    `)
    .eq("role", "new_worker")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching pending workers:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/workers">
          <Button variant="outline" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-foreground">Pending Verification</h2>
      </div>

      <div className="grid gap-4">
        {!pendingWorkers || pendingWorkers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              No workers pending verification.
            </CardContent>
          </Card>
        ) : (
          pendingWorkers.map((worker: any) => (
            <Card key={worker.id} className="overflow-hidden border-amber-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/30">
                <div className="space-y-1">
                  <span className="font-semibold text-lg">{worker.full_name}</span>
                  <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4">
                    <span>Phone: {worker.phone}</span>
                    <span className="capitalize">Gender: {(Array.isArray(worker.workers) ? worker.workers[0] : worker.workers)?.gender}</span>
                    <span className="col-span-2">Address: {worker.address}</span>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-0">
                  <VerifyAction workerId={worker.id} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
