import * as React from "react";
import { cn } from "../../lib/utils";

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

type CardTitleProps = React.ComponentProps<"h1"> & {
  /** Heading level — defaults to h3 since a Card is usually one of many on
   * a page (item cards, tiles); pass as="h1" only where a card IS the
   * page's primary heading (e.g. the auth screens' AuthCard). */
  as?: "h1" | "h2" | "h3" | "h4";
};

function CardTitle({ className, as: Tag = "h3", ...props }: CardTitleProps) {
  return (
    <Tag
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
