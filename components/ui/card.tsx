import type { PropsWithChildren, ReactNode } from "react";
import { clsx } from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
  action?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
}>;

export function Card({ className, children, action, title, description }: CardProps) {
  return (
    <section
      className={clsx(
        "rounded-3xl border border-white/30 bg-surface p-6 shadow-card",
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
              <p className="mt-1 text-sm text-accent/60">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

