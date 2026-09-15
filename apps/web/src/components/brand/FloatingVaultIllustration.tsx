import { FileText, Image as ImageIcon, KeyRound, Lock } from "lucide-react";
import { cn } from "@kryvex/ui";

const FLOATING_ITEMS: {
  icon: typeof Lock;
  className: string;
}[] = [
  { icon: Lock, className: "left-[8%] top-[12%] rotate-[-6deg]" },
  { icon: FileText, className: "right-[6%] top-[6%] rotate-[4deg]" },
  { icon: ImageIcon, className: "left-[4%] bottom-[10%] rotate-[5deg]" },
  { icon: KeyRound, className: "right-[10%] bottom-[4%] rotate-[-4deg]" },
];

/**
 * Screen 1 (Welcome) decorative visual — subtle indigo glow behind
 * floating secure-item cards. No external images; SVG/CSS only.
 * See KRYVEX_UI_README.md §20.
 */
export function FloatingVaultIllustration() {
  return (
    <div
      className="relative mx-auto h-56 w-full max-w-xs sm:h-64 sm:max-w-sm"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-[32px] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.35), transparent)",
        }}
      />
      <div className="relative flex h-full items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border-strong bg-card shadow-lg sm:h-24 sm:w-24">
          <Lock className="h-9 w-9 text-primary" strokeWidth={1.75} />
        </div>
      </div>
      {FLOATING_ITEMS.map(({ icon: Icon, className }, i) => (
        <div
          key={i}
          className={cn(
            "absolute flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface shadow-md",
            className,
          )}
        >
          <Icon className="h-5 w-5 text-text-secondary" strokeWidth={1.75} />
        </div>
      ))}
    </div>
  );
}
