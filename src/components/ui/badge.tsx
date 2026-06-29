import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground ring-border",
        primary: "bg-brand-50 text-brand-700 ring-brand-100",
        accent: "bg-brand-50 text-brand-700 ring-brand-100",
        good: "bg-mint-soft text-mint ring-mint/20",
        warn: "bg-lemon-soft text-lemon ring-lemon/20",
        danger: "bg-blush-soft text-blush ring-blush/20",
        outline: "text-muted-foreground ring-border",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
