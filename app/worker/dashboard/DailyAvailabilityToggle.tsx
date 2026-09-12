"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { updateDailyAvailabilityAction } from "@/app/actions/worker";

export default function DailyAvailabilityToggle({ 
  initialStatus,
  todayStr
}: { 
  initialStatus: 'available' | 'leave';
  todayStr: string;
}) {
  const [status, setStatus] = useState<'available' | 'leave'>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [isWithinWindow, setIsWithinWindow] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  useEffect(() => {
    // Check if current time in IST is between 07:00:00 and 07:30:00
    const checkTime = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(now);
      
      setCurrentTimeStr(timeStr);
      setIsWithinWindow(timeStr >= '07:00:00' && timeStr < '07:30:00');
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    if (!isWithinWindow) return;
    
    setError("");
    const newStatus = status === 'available' ? 'leave' : 'available';
    setStatus(newStatus);
    
    startTransition(async () => {
      const res = await updateDailyAvailabilityAction(newStatus);
      if (res.error) {
        setError(res.error);
        setStatus(status); // revert
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-3 bg-card p-6 rounded-xl border shadow-sm">
      <h3 className="text-lg font-semibold text-center">
        Availability for Today ({todayStr})
      </h3>
      
      <div className="flex items-center gap-4">
        <span className={`font-medium ${status === 'available' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          Available
        </span>
        <button
          onClick={handleToggle}
          disabled={isPending || !isWithinWindow}
          className={`
            relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2
            ${status === 'leave' ? 'bg-amber-500' : 'bg-emerald-500'}
            ${(!isWithinWindow || isPending) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <span
            className={`
              inline-block h-6 w-6 transform rounded-full bg-white transition-transform
              ${status === 'leave' ? 'translate-x-7' : 'translate-x-1'}
            `}
          />
        </button>
        <span className={`font-medium ${status === 'leave' ? 'text-amber-600' : 'text-muted-foreground'}`}>
          On Leave
        </span>
      </div>

      {!isWithinWindow ? (
        <p className="text-sm text-muted-foreground text-center mt-2">
          You can only change your availability between 07:00 and 07:30 AM.<br/>
          Current time: {currentTimeStr}
        </p>
      ) : (
        <p className="text-sm text-brand-primary text-center mt-2 font-medium animate-pulse">
          Update window is currently OPEN.<br/>
          Current time: {currentTimeStr}
        </p>
      )}

      {error && <p className="text-sm text-destructive text-center mt-2">{error}</p>}
    </div>
  );
}
