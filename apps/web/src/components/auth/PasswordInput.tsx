"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  label: string;
  error?: string | undefined;
}

/**
 * Master-password input with a show/hide toggle — KRYVEX_UI_README.md §14
 * ("Password fields must include: show/hide control, accessible label,
 * ... no password value in logs"). The value never leaves this component
 * except via onChange/ref, same as a plain input — nothing here logs it.
 */
export const PasswordInput = React.forwardRef<
  HTMLInputElement,
  PasswordInputProps
>(({ label, error, id, className, ...props }, ref) => {
  const [revealed, setRevealed] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          ref={ref}
          id={inputId}
          type={revealed ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          className={cn("pr-11 font-mono text-sm", className)}
          {...props}
        />
        <button
          type="button"
          aria-label={revealed ? "Hide password" : "Show password"}
          aria-pressed={revealed}
          onClick={() => setRevealed((r) => !r)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        >
          {revealed ? (
            <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
