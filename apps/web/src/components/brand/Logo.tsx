import { cn } from "@kryvex/ui";

interface LogoProps {
  className?: string;
  markSize?: number;
  showWordmark?: boolean;
}

/**
 * Kryvex brand mark — geometric "K", legible from 16px, dark/light-safe.
 * See KRYVEX_UI_README.md §3.
 */
export function Logo({
  className,
  markSize = 32,
  showWordmark = true,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="9" fill="var(--primary)" />
        <path
          d="M11 8v16M11 16l7.5-8M11 16l7.5 8"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span className="text-lg font-semibold tracking-tight text-foreground">
          Kryvex
        </span>
      )}
    </div>
  );
}
