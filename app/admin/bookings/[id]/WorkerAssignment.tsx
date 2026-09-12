"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { assignWorkersAction } from "@/app/actions/admin";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type Worker = {
  id: string;
  full_name: string;
  workers: { has_bike: boolean }[];
};

export default function WorkerAssignment({ 
  bookingId, 
  availableWorkers 
}: { 
  bookingId: string; 
  availableWorkers: Worker[] 
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (selectedIds.length === 0) return;
    setError("");
    startTransition(async () => {
      const res = await assignWorkersAction(bookingId, selectedIds);
      if (res.error) setError(res.error);
    });
  };

  const filteredWorkers = availableWorkers.filter(w => 
    w.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">Assign Workers</h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search workers..." 
            className="pl-9" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {availableWorkers.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-muted-foreground text-center">
            No active workers are available for assignment right now.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWorkers.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <label className="flex items-start space-x-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={selectedIds.includes(w.id)}
                  onCheckedChange={() => handleToggle(w.id)}
                  disabled={isPending}
                  className="mt-1"
                />
                <div className="flex flex-col">
                  <span className="font-medium">{w.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {w.workers[0]?.has_bike ? "Has Bike" : "No Bike"}
                  </span>
                </div>
              </label>
            </Card>
          ))}
          {filteredWorkers.length === 0 && (
            <div className="col-span-full py-8 text-center text-muted-foreground">
              No workers match your search.
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      
      <Button 
        onClick={handleAssign} 
        disabled={isPending || selectedIds.length === 0}
        className="bg-brand-primary text-white hover:bg-brand-primary/90 mt-4"
      >
        {isPending ? "Assigning..." : `Assign ${selectedIds.length} Worker(s)`}
      </Button>
    </div>
  );
}
