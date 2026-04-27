import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default: "bg-primary/15 text-primary ring-primary/25",
        secondary: "bg-muted text-foreground ring-border",
        destructive: "bg-destructive/15 text-destructive ring-destructive/25",
        outline: "bg-transparent text-foreground ring-border",
        success: "bg-success/15 text-success ring-success/25",
        warning: "bg-warning/15 text-warning ring-warning/25",
        info: "bg-info/15 text-info ring-info/25",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
