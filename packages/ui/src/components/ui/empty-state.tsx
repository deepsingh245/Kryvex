import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2">
          <Icon className="h-5 w-5 text-text-secondary" strokeWidth={1.75} />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export { EmptyState };
