"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: "left" | "right";
  children?: React.ReactNode;
  className?: string;
}

/**
 * Hand-rolled slide-over panel — used for the mobile nav drawer
 * (KRYVEX_UI_README.md §16: "sheets/drawers for secondary navigation").
 * Same escape/backdrop-close contract as Dialog, no focus trap (the nav
 * list inside is short and a trap adds more friction than value here).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  side = "left",
  children,
  className,
}: SheetProps) {
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute inset-y-0 flex w-full max-w-xs flex-col gap-4 bg-surface p-5 shadow-lg",
          side === "left" ? "left-0" : "right-0",
          className,
        )}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-sm font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close menu"
            className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
