"use client";

import { clsx } from "clsx";

interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
}

export function Progress({
  value = 0,
  max = 100,
  className = "",
  indicatorClassName = "",
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={clsx(
        "relative h-2 w-full overflow-hidden rounded-full bg-white/10",
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className={clsx(
          "h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300",
          indicatorClassName
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

