import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import AddWorkerForm from "./AddWorkerForm";

export default function NewWorkerPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/workers">
          <Button variant="outline" size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold text-foreground">Add New Worker</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Direct Registration</CardTitle>
          <CardDescription>
            Add a worker directly to the system. When they log in with this phone number via OTP, 
            they will automatically bypass the pending verification queue and become an active worker.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddWorkerForm />
        </CardContent>
      </Card>
    </div>
  );
}
