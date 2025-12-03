"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={clsx(
          "flex min-h-[80px] w-full rounded-lg border bg-surface/50 px-3 py-2 text-sm text-white placeholder:text-white/40",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200",
          error
            ? "border-red-500/50 focus:ring-red-500/40 focus:border-red-500/50"
            : "border-white/10 hover:border-white/20",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

