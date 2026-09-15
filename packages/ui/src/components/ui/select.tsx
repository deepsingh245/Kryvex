import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

// A token-styled NATIVE <select> — not a custom listbox. Nothing in this
// app needs multi-select or search-in-list, and a native select keeps full
// keyboard/screen-reader behavior for free.
const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-11 w-full appearance-none rounded-md border border-border-strong bg-surface px-3.5 pr-9 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 outline-none",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  );
});
Select.displayName = "Select";

export { Select };
