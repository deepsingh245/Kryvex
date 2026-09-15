"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  onBack?: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Shared centered-card shell for Screens 02/03 (Create Master Password,
 * Unlock Vault) — back button + security icon + heading + description.
 * See KRYVEX_UI_README.md §21/§22.
 */
export function AuthCard({
  icon: Icon,
  title,
  description,
  onBack,
  children,
  className,
}: AuthCardProps) {
  return (
    <Card className={cn("w-full max-w-sm p-6 sm:p-8", className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="mb-5 -ml-2 flex h-9 w-9 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
        </button>
      )}
      <CardHeader className="mb-6">
        {Icon && (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className="h-7 w-7 text-primary" strokeWidth={1.75} />
          </div>
        )}
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
