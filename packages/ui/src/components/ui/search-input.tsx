import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";

const SearchInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, ...props }, ref) => {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        className={cn(
          "flex h-11 w-full min-w-0 rounded-full border border-border-strong bg-surface pl-10 pr-3.5 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-text-muted",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </div>
  );
});
SearchInput.displayName = "SearchInput";

export { SearchInput };
