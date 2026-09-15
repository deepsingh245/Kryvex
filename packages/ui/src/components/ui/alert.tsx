import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva(
  "flex items-start gap-2.5 rounded-md border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "border-info/30 bg-info/10 text-foreground",
        success: "border-success/30 bg-success/10 text-foreground",
        warning: "border-warning/30 bg-warning/10 text-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

const ICON_BY_VARIANT = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: XCircle,
} as const;

const ICON_COLOR_BY_VARIANT = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, children, ...props }: AlertProps) {
  const resolved = variant ?? "info";
  const Icon = ICON_BY_VARIANT[resolved];
  return (
    <div
      role={resolved === "destructive" ? "alert" : "status"}
      className={cn(alertVariants({ variant, className }))}
      {...props}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", ICON_COLOR_BY_VARIANT[resolved])}
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}

export { Alert };
