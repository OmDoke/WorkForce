"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { verifyWorkerAction } from "@/app/actions/admin";

export default function VerifyAction({ workerId }: { workerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleVerify = () => {
    setError("");
    startTransition(async () => {
      const res = await verifyWorkerAction(workerId);
      if (res.error) setError(res.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button 
        onClick={handleVerify} 
        disabled={isPending}
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {isPending ? "Approving..." : "Approve Worker"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
