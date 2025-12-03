import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { clsx } from "clsx";

const buttonStyles = cva(
  "relative inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
        secondary:
          "bg-surface-muted/50 text-accent border border-white/10 hover:bg-surface-muted hover:border-primary/30 hover:-translate-y-0.5",
        ghost:
          "bg-transparent text-accent-soft hover:text-accent hover:bg-white/5",
        destructive:
          "bg-gradient-to-r from-danger to-danger/80 text-white shadow-lg shadow-danger/25 hover:shadow-xl hover:shadow-danger/30 hover:-translate-y-0.5",
        outline:
          "bg-transparent text-primary border border-primary/40 hover:bg-primary/10 hover:border-primary",
        glow:
          "bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] text-white shadow-glow hover:shadow-glow animate-shimmer",
      },
      size: {
        sm: "px-3 py-1.5 text-xs gap-1.5",
        md: "px-4 py-2 text-sm gap-2",
        lg: "px-6 py-3 text-base gap-2",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(buttonStyles({ variant, size }), className)}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

/**
 * Icon button variant
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, "size"> & { size?: "sm" | "md" | "lg" }
>(({ className, variant = "ghost", size = "md", ...props }, ref) => {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center rounded-xl transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        variant === "ghost" && "hover:bg-white/5 text-accent-soft hover:text-accent",
        variant === "primary" && "bg-primary/10 text-primary hover:bg-primary/20",
        variant === "destructive" && "hover:bg-danger/10 text-danger",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
});

IconButton.displayName = "IconButton";
