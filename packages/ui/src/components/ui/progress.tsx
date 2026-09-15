import * as React from "react";
import { cn } from "../../lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  value: number;
  max?: number;
  indicatorClassName?: string;
}

function Progress({
  className,
  indicatorClassName,
  value,
  max = 100,
  ...props
}: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-surface-2",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width,background-color] duration-200 ease-out",
          indicatorClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export { Progress };
