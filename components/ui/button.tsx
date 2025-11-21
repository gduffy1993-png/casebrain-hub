import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { clsx } from "clsx";

const buttonStyles = cva(
  "inline-flex items-center justify-center rounded-full font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white shadow-card hover:bg-primary/90 focus-visible:outline-primary",
        secondary:
          "bg-surface text-primary border border-primary/40 hover:bg-primary/10 focus-visible:outline-primary",
        ghost:
          "bg-transparent text-primary hover:bg-primary/10 focus-visible:outline-primary",
        destructive:
          "bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-5 py-2 text-sm",
        lg: "px-6 py-3 text-base",
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
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(buttonStyles({ variant, size }), className)}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

