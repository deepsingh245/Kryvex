import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { FloatingVaultIllustration } from "@/components/brand/FloatingVaultIllustration";
import { Logo } from "@/components/brand/Logo";

/**
 * Screen 01 — Welcome / Onboarding. See KRYVEX_UI_README.md §20. Reached
 * either directly or via the SIGNED_OUT redirect in ../page.tsx.
 */
export default function WelcomePage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-10 px-6 py-16 sm:gap-12 sm:px-8">
      <Logo markSize={40} className="text-2xl" />

      <div className="flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <p className="text-lg text-text-secondary">
          Your private vault. Always.
        </p>

        <FloatingVaultIllustration />

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
            Store everything that matters
          </h1>
          <p className="text-base leading-relaxed text-text-secondary">
            Passwords, credentials, secure notes, files, and more — all in
            one encrypted vault, accessible only by you.
          </p>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Link
          href="/sign-up"
          className={buttonVariants({ variant: "primary", size: "lg", className: "w-full" })}
        >
          Get Started
        </Link>
        <Link
          href="/sign-in"
          className="text-sm text-text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          I already have an account
        </Link>
      </div>
    </main>
  );
}
