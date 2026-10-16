import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Top-left "go back" affordance shared by every sub-page, so back navigation
// sits in the same place everywhere instead of being a text link at the
// bottom of each page.
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="-ml-2 inline-flex h-9 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
