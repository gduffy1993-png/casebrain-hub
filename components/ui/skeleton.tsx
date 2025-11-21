import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-xl bg-surface-muted/80",
        className,
      )}
    />
  );
}

