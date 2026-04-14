import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs text-sm font-medium transition-all disabled:pointer-events-none hover:cursor-pointer disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-0 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-slate-300 focus-visible:border-[1px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/80 active:bg-primary/80 transition-all duration-200 ease-in-out",
        destructive:
          "bg-destructive text-white hover:bg-destructive/80 active:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "border border-slate-300 bg-background hover:bg-neutral-100 active:bg-neutral-100 transition-all duration-200 ease-in-out",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/80",
        ghost:
          "hover:bg-neutral-100 active:bg-neutral-100 hover:text-accent-foreground active:text-accent-foreground transition-all duration-200 ease-in-out",
        hovers:
          "border border-white hover:border-slate-300 active:border-slate-300 bg-background hover:bg-neutral-100 active:bg-neutral-100 transition-all duration-200 ease-in-out",
        link: "text-primary underline-offset-8 hover:underline active:underline",
      },
      size: {
        default: "py-2 px-3",
        sm: "h-8 rounded-xs gap-1.5",
        lg: "h-10 rounded-xs px-3",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
