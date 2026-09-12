"use client";

import { useState, useTransition, useOptimistic } from "react";
import { toggleWorkerStatusAction } from "@/app/actions/worker";

export default function WorkerStatusToggle({ 
  workerId, 
  initialIsOnLeave 
}: { 
  workerId: string; 
  initialIsOnLeave: boolean; 
}) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [optimisticIsOnLeave, addOptimisticIsOnLeave] = useOptimistic(
    initialIsOnLeave,
    (state: boolean, newStatus: boolean) => newStatus
  );

  const handleToggle = () => {
    setError("");
    const newStatus = !optimisticIsOnLeave;
    
    startTransition(async () => {
      addOptimisticIsOnLeave(newStatus);
      const res = await toggleWorkerStatusAction(workerId, !newStatus);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Global Leave Status
      </span>
      <div className="flex items-center gap-3">
        <span className={`text-sm font-medium ${!optimisticIsOnLeave ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          Active
        </span>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2
            ${optimisticIsOnLeave ? 'bg-amber-500' : 'bg-emerald-500'}
            ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${optimisticIsOnLeave ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <span className={`text-sm font-medium ${optimisticIsOnLeave ? 'text-amber-600' : 'text-muted-foreground'}`}>
          On Leave
        </span>
      </div>
      {error && (
        <p className="text-xs text-destructive text-center max-w-[160px]">{error}</p>
      )}
    </div>
  );
}
