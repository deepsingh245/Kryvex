import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card text-card-foreground shadow-md",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col items-center gap-3 text-center", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "text-xl font-semibold tracking-tight text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-text-secondary", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-4", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
