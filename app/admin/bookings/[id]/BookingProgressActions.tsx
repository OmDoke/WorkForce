"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateBookingStatusAction } from "@/app/actions/admin";
import { PlayCircle, CheckCircle } from "lucide-react";

type BookingStatus = 'assigned' | 'in_progress';

export default function BookingProgressActions({ 
  bookingId, 
  status 
}: { 
  bookingId: string; 
  status: BookingStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleStatusChange = (newStatus: string) => {
    setError("");
    startTransition(async () => {
      const res = await updateBookingStatusAction(bookingId, newStatus);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {status === 'assigned' && (
        <Button
          onClick={() => handleStatusChange("in_progress")}
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {isPending ? "Updating..." : "Mark as In Progress"}
        </Button>
      )}
      {(status === 'assigned' || status === 'in_progress') && (
        <Button
          onClick={() => handleStatusChange("completed")}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {isPending ? "Updating..." : "Mark as Completed"}
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
