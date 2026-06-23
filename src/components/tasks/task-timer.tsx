"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface TaskTimerProps {
  startedAt: string;
}

export function TaskTimer({ startedAt }: TaskTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();

    function tick() {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono text-blue-600">
      <Clock className="h-3 w-3 animate-pulse" />
      <span>{formatDuration(elapsed)}</span>
    </div>
  );
}
