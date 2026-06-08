import type { PropsWithChildren, ReactNode } from "react";
import { clsx } from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
  action?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "glass" | "gradient";
  animate?: boolean;
}>;

// =============================================================================
// Additional Card Components (for compatibility with shadcn patterns)
// =============================================================================

export function CardHeader({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("mb-3", className)}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <h3 className={clsx("text-sm font-semibold text-white/90", className)}>
      {children}
    </h3>
  );
}

export function CardContent({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("", className)}>
      {children}
    </div>
  );
}

export function CardDescription({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <p className={clsx("text-xs text-white/50 mt-1", className)}>
      {children}
    </p>
  );
}

export function CardFooter({
  children,
  className = "",
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx("mt-4 pt-3 border-t border-white/5", className)}>
      {children}
    </div>
  );
}

export function Card({
  className,
  children,
  action,
  title,
  description,
  variant = "default",
  animate = true,
}: CardProps) {
  const variantStyles = {
    default: "bg-card backdrop-blur-xl border border-border shadow-xl shadow-black/40",
    glass: "glass-card",
    gradient: "gradient-border bg-card",
  };

  return (
    <section
      className={clsx(
        "rounded-2xl p-6 shadow-card transition-all duration-300",
        variantStyles[variant],
        animate && "hover:shadow-card-hover hover:border-primary/20",
        className,
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-accent">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-accent-soft">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Stat card for dashboard metrics
 */
type StatCardProps = {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
};

export function StatCard({ label, value, change, trend, icon }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card backdrop-blur-xl border border-border shadow-xl shadow-black/40 p-6 transition-all duration-300 hover:shadow-card-hover hover:border-primary/30">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-accent-soft">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-accent">
            {value}
          </p>
          {change && (
            <p
              className={clsx(
                "mt-2 text-sm font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-danger",
                trend === "neutral" && "text-accent-soft",
              )}
            >
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Feature card with icon
 */
type FeatureCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
};

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card backdrop-blur-xl border border-border shadow-xl shadow-black/40 p-6 transition-all duration-300 hover:shadow-card-hover hover:border-primary/30 hover:-translate-y-1">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative">
        <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 p-3">
          <span className="text-primary">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-accent">{title}</h3>
        <p className="mt-2 text-sm text-accent-soft">{description}</p>
      </div>
    </div>
  );
}
