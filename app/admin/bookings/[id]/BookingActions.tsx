"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateBookingStatusAction } from "@/app/actions/admin";

export default function BookingActions({ bookingId, status }: { bookingId: string, status: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (status !== 'pending') return null;

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      const res = await updateBookingStatusAction(bookingId, newStatus);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        <Button 
          onClick={() => handleStatusChange("accepted")} 
          disabled={isPending}
          className="bg-brand-primary text-white hover:bg-brand-primary/90"
        >
          {isPending ? "Processing..." : "Accept Booking"}
        </Button>
        <Button 
          onClick={() => handleStatusChange("rejected")} 
          disabled={isPending}
          variant="destructive"
        >
          Reject
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
