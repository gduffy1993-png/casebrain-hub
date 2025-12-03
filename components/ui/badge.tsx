import type { PropsWithChildren } from "react";
import { clsx } from "clsx";

type BadgeProps = PropsWithChildren<{
  variant?: "default" | "success" | "warning" | "danger" | "primary" | "secondary" | "outline";
  size?: "sm" | "md";
  className?: string;
  glow?: boolean;
}>;

export function Badge({ 
  variant = "default", 
  size = "sm",
  className, 
  children,
  glow = false,
}: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-accent-soft border border-white/10",
    success: "bg-success/15 text-success border border-success/20",
    warning: "bg-warning/15 text-warning border border-warning/20",
    danger: "bg-danger/15 text-danger border border-danger/20",
    primary: "bg-primary/15 text-primary border border-primary/20",
    secondary: "bg-secondary/15 text-secondary border border-secondary/20",
    outline: "bg-transparent text-accent-soft border border-white/20",
  };

  const sizes = {
    sm: "px-2.5 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide transition-colors",
        variants[variant],
        sizes[size],
        glow && variant === "success" && "shadow-[0_0_10px_rgba(16,185,129,0.3)]",
        glow && variant === "warning" && "shadow-[0_0_10px_rgba(245,158,11,0.3)]",
        glow && variant === "danger" && "shadow-[0_0_10px_rgba(239,68,68,0.3)]",
        glow && variant === "primary" && "shadow-[0_0_10px_rgba(6,182,212,0.3)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Status indicator dot with optional pulse animation
 */
type StatusDotProps = {
  status: "success" | "warning" | "danger" | "neutral";
  pulse?: boolean;
  size?: "sm" | "md";
};

export function StatusDot({ status, pulse = false, size = "sm" }: StatusDotProps) {
  const colors = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-accent-muted",
  };

  const sizes = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
  };

  return (
    <span className="relative inline-flex">
      <span className={clsx("rounded-full", colors[status], sizes[size])} />
      {pulse && (
        <span
          className={clsx(
            "absolute inset-0 rounded-full animate-ping",
            colors[status],
            "opacity-75",
          )}
        />
      )}
    </span>
  );
}
