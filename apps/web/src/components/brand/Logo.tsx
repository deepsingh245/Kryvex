import Image from "next/image";
import { cn } from "@kryvex/ui";

interface LogoProps {
  className?: string;
  markSize?: number;
  showWordmark?: boolean;
}

/**
 * Kryvex brand mark, shared by marketing, authentication, and vault shells.
 * See KRYVEX_UI_README.md §3.
 */
export function Logo({
  className,
  markSize = 32,
  showWordmark = true,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/brand/kryvex-mark.png"
        width={markSize}
        height={markSize}
        alt={showWordmark ? "" : "Kryvex"}
        className="shrink-0 rounded-[28%] bg-[#f8fbff] p-[5%] shadow-sm ring-1 ring-slate-900/10"
      />
      {showWordmark && (
        <span className="text-base font-bold tracking-[0.18em] text-foreground">
          KRYVEX
        </span>
      )}
    </div>
  );
}
