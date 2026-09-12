"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelBookingAction } from "@/app/actions/booking";
import { X } from "lucide-react";

export default function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const handleCancel = () => {
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await cancelBookingAction(bookingId);
      if (res.error) {
        setError(res.error);
        setConfirmed(false);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={confirmed ? "destructive" : "outline"}
        size="sm"
        disabled={isPending}
        onClick={handleCancel}
        className={confirmed ? "" : "text-destructive border-destructive hover:bg-destructive hover:text-white"}
      >
        <X className="w-4 h-4 mr-1" />
        {isPending ? "Cancelling..." : confirmed ? "Confirm Cancel" : "Cancel Booking"}
      </Button>
      {confirmed && !isPending && (
        <p className="text-xs text-muted-foreground">Click again to confirm.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
