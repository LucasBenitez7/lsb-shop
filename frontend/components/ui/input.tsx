import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          // base
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary hover:bg-neutral-50 selection:text-primary-foreground dark:bg-input/30 h-10 w-full min-w-0 border rounded-xs border-border bg-background px-2 py-1 text-base shadow-xs transition-[border-color,box-shadow,color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",

          // focus: borde negro y sombra sutil, sin ring
          "focus-visible:border-foreground focus-visible:bg-background",

          // error: borde + sombra rojos (sin aura extra)
          "aria-invalid:border-destructive",

          "[&::-webkit-search-cancel-button]:appearance-none",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
