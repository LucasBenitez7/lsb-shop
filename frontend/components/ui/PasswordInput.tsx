"use client";

import { useState, type ComponentProps, forwardRef } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

import { cn } from "@/lib/utils";

import { Input } from "./input";

const PasswordInput = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-0 top-0 h-full px-3 py-2 hover:cursor-pointer hover:bg-transparent text-foreground sm:text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          tabIndex={-1}
        >
          {show ? (
            <FaEyeSlash className="size-4" aria-hidden="true" />
          ) : (
            <FaEye className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
