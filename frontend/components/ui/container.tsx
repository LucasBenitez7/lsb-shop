import * as React from "react";

import { cn } from "@/lib/utils";

export const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("mx-auto w-full", className)} {...props} />
));
Container.displayName = "Container";
