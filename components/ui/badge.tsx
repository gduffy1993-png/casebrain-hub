import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

type BadgeProps = PropsWithChildren<{
  variant?: "default" | "success" | "warning" | "danger" | "primary" | "secondary";
  className?: string;
}>;

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        {
          default: "bg-primary/10 text-primary",
          success: "bg-success/10 text-success",
          warning: "bg-warning/10 text-warning",
          danger: "bg-danger/10 text-danger",
          primary: "bg-primary/10 text-primary",
          secondary: "bg-secondary/10 text-secondary",
        }[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

