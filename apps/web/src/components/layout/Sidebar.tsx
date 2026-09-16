"use client";

import {
  Code2,
  CreditCard,
  Files,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Mail,
  Settings as SettingsIcon,
  Shield,
  Star,
  StickyNote,
  User,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@kryvex/ui";
import { Logo } from "@/components/brand/Logo";
import { useVault } from "@/providers/VaultProvider";

const CATEGORIES: { label: string; type: string; icon: LucideIcon }[] = [
  { label: "Logins", type: "login", icon: KeyRound },
  { label: "Emails", type: "email", icon: Mail },
  { label: "Secure Notes", type: "secureNote", icon: StickyNote },
  { label: "Cards", type: "card", icon: CreditCard },
  { label: "Identities", type: "identity", icon: User },
  { label: "API Keys", type: "apiKey", icon: Code2 },
  { label: "Recovery Codes", type: "recoveryCodes", icon: Shield },
  { label: "Files", type: "files", icon: Files },
];

function NavLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-text-secondary hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {children}
    </Link>
  );
}

export function SidebarNav() {
  const { lock, signOut } = useVault();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const onHome = pathname === "/";
  const favoritesOnly = searchParams.get("favorites") === "true";
  const typeFilter = searchParams.get("type");

  return (
    <>
      <div className="flex flex-col gap-1">
        <NavLink href="/" active={onHome && !favoritesOnly && !typeFilter} icon={Layers}>
          All Items
        </NavLink>
        <NavLink href="/?favorites=true" active={onHome && favoritesOnly} icon={Star}>
          Favorites
        </NavLink>
      </div>

      <div className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
          Categories
        </p>
        {CATEGORIES.map(({ label, type, icon }) => (
          <NavLink
            key={type}
            href={`/?type=${type}`}
            active={onHome && typeFilter === type}
            icon={icon}
          >
            {label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
        <NavLink
          href="/settings"
          active={pathname.startsWith("/settings")}
          icon={SettingsIcon}
        >
          Settings
        </NavLink>
        <NavLink
          href="/generator"
          active={pathname.startsWith("/generator")}
          icon={Wand2}
        >
          Generator
        </NavLink>
        <button
          type="button"
          onClick={() => lock("manual")}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Lock className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Lock Vault
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 md:flex">
      <div className="px-1">
        <Logo markSize={28} />
      </div>
      <nav className="flex flex-1 flex-col gap-6">
        <SidebarNav />
      </nav>
    </aside>
  );
}
