"use client";

import { Menu } from "lucide-react";
import { useState } from "react";
import { Sheet } from "@kryvex/ui";
import { Logo } from "@/components/brand/Logo";
import { SidebarNav } from "./Sidebar";

export function MobileTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
      <Logo markSize={24} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="flex h-11 w-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-5 w-5" strokeWidth={1.75} />
      </button>

      <Sheet open={open} onOpenChange={setOpen} title="Menu">
        <nav className="flex flex-1 flex-col gap-6" onClick={() => setOpen(false)}>
          <SidebarNav />
        </nav>
      </Sheet>
    </header>
  );
}
