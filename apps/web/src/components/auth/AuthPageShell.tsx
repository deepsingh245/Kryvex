import Link from "next/link";
import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@kryvex/ui";
import { Logo } from "@/components/brand/Logo";
import { PageThemeToggle } from "@/components/layout/ThemeToggle";

type AuthPageContext = "sign-in" | "sign-up" | "recover" | "unlock";

interface AuthPageShellProps {
  children: ReactNode;
  context?: AuthPageContext;
  contentClassName?: string;
}

const CONTEXT_COPY: Record<AuthPageContext, [string, string, string]> = {
  "sign-in": [
    "Private by design",
    "Welcome back to a vault only you can unlock.",
    "Your account signs you in. Your master password unlocks your encrypted vault on this device.",
  ],
  "sign-up": [
    "Start private",
    "One secure home for the details that run your digital life.",
    "Create a master password that protects your vault locally and stays separate from your account sign-in.",
  ],
  unlock: [
    "Protected every time",
    "Your vault stays locked until you open it.",
    "Signing in identifies your account. Unlocking decrypts your vault locally on this device.",
  ],
  recover: [
    "Recovery in your hands",
    "Restore access without giving up your privacy.",
    "Your Recovery Key lets you regain access without giving the server a way to decrypt your vault.",
  ],
};

const SECURITY_POINTS = [
  [
    "Encrypted on your device",
    "Readable vault data stays on the device where you unlock it.",
    ShieldCheck,
  ],
  [
    "Sign-in and unlock stay separate",
    "An account session alone cannot open your encrypted vault.",
    LockKeyhole,
  ],
  [
    "Your recovery key belongs to you",
    "Kryvex does not keep a server-side decryption key.",
    KeyRound,
  ],
] as const;

/** Phones keep the focused form; desktop gets a true split-screen surface. */
export function AuthPageShell({
  children,
  context = "sign-in",
  contentClassName,
}: AuthPageShellProps) {
  const [eyebrow, title, description] = CONTEXT_COPY[context];

  return (
    <main className="relative min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(32rem,0.92fr)]">
      <PageThemeToggle />

      <aside className="relative hidden min-h-screen overflow-hidden border-r border-border bg-surface px-10 py-9 text-foreground transition-colors lg:flex lg:flex-col xl:px-14 xl:py-12">
        <div
          aria-hidden="true"
          className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -right-28 bottom-16 h-80 w-80 rounded-full bg-primary-soft/10 blur-3xl"
        />

        <Link
          href="/welcome"
          aria-label="Kryvex home"
          className="relative z-10 w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Logo markSize={34} />
        </Link>

        <div className="relative z-10 my-auto w-full max-w-xl self-center py-14">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary-soft">
            {eyebrow}
          </p>
          <h2 className="mt-5 max-w-xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.045em] text-foreground xl:text-5xl">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-text-secondary">
            {description}
          </p>

          <div className="mt-10 grid max-w-xl gap-3">
            {SECURITY_POINTS.map(([pointTitle, pointDescription, Icon]) => (
              <div
                key={pointTitle}
                className="flex items-start gap-4 rounded-2xl border border-border bg-background/70 p-4 backdrop-blur-sm transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary-soft">
                  <Icon
                    className="h-5 w-5"
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{pointTitle}</p>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {pointDescription}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs leading-5 text-text-muted">
          Zero-knowledge architecture · Your server-stored vault remains
          encrypted
        </p>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center px-5 pb-10 pt-24 sm:px-8 lg:px-12 lg:py-12 xl:px-16">
        <Link
          href="/welcome"
          aria-label="Kryvex home"
          className="absolute left-5 top-6 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:left-8 lg:hidden"
        >
          <Logo markSize={30} />
        </Link>
        <div className={cn("w-full max-w-lg", contentClassName)}>
          {children}
        </div>
      </section>
    </main>
  );
}
