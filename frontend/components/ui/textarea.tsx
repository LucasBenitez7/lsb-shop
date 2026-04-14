import * as React from "react";
import TextareaAutosize, {
  type TextareaAutosizeProps,
} from "react-textarea-autosize";

import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaAutosizeProps {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextareaAutosize
        className={cn(
          "flex w-full rounded-xs border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[80px] resize-none focus-visible:border-foreground text-base md:text-sm",
          className,
        )}
        ref={ref}
        minRows={3}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";
