import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  ChevronDown,
  Copy,
  CreditCard,
  File,
  FileImage,
  FileText,
  Fingerprint,
  FolderSearch2,
  Grid2X2,
  IdCard,
  KeyRound,
  Laptop,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { buttonVariants, cn } from "@kryvex/ui";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const BEFORE_ITEMS = [
  ["Browser passwords", "Saved in different places", KeyRound],
  ["Notes apps", "Easy to forget and hard to find", FileText],
  ["Files and documents", "Buried in folders and drives", File],
  ["Memory", "Hoping you remember", Sparkles],
] as const;

const VAULT_ITEMS = [
  ["GitHub", "alex@kryvex.dev", "Login"],
  ["AWS production", "ak_••••••••••", "Developer key"],
  ["Passport scan", "Identity document", "Identity"],
  ["Home Wi-Fi", "••••••••••••", "Secure note"],
  ["Emergency codes", "10 codes protected", "Recovery codes"],
] as const;

const ITEM_TYPES = [
  ["Logins", KeyRound],
  ["Emails", Mail],
  ["Secure notes", FileText],
  ["Identities", UserRound],
  ["Cards", CreditCard],
  ["PINs", Fingerprint],
  ["API keys", Braces],
  ["Recovery codes", Grid2X2],
  ["Images", FileImage],
  ["PDFs", FileText],
  ["Files", File],
  ["Custom", IdCard],
] as const;

const FAQS = [
  {
    question: "What is Kryvex?",
    answer:
      "Kryvex is a personal encrypted vault for passwords, credentials, secure notes, identity data, recovery codes and files. It keeps everything organized around one simple loop: unlock, find and use.",
  },
  {
    question: "Is it really free to start?",
    answer:
      "Yes. You can create a vault without entering payment details. If paid plans are introduced later, the free path will remain clearly explained before you commit.",
  },
  {
    question: "How does zero-knowledge encryption work?",
    answer:
      "Your vault contents are encrypted on your device before they are stored across devices. Kryvex keeps only encrypted records, while your master password stays separate from account authentication and never becomes a server-side decryption key.",
  },
  {
    question: "Can I use Kryvex on multiple devices?",
    answer:
      "The web vault is the current release focus. Native mobile support is in development, with the same encrypted data model and safeguards for changes made on different devices.",
  },
] as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
      {children}
    </p>
  );
}

function MarketingHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link
          href="/welcome"
          aria-label="Kryvex home"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Logo markSize={30} />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-8 text-sm font-medium text-text-secondary md:flex"
        >
          <a className="transition-colors hover:text-foreground" href="#product">
            Product
          </a>
          <a className="transition-colors hover:text-foreground" href="#security">
            Security
          </a>
          <a className="transition-colors hover:text-foreground" href="#workflow">
            How it works
          </a>
          <a className="transition-colors hover:text-foreground" href="#faq">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-1 sm:gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className={buttonVariants({
              variant: "primary",
              size: "sm",
              className: "whitespace-nowrap",
            })}
          >
            Create a free vault
          </Link>
        </div>
      </div>
    </header>
  );
}

function MiniVaultList() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#263247] bg-[#0b1120] p-4 text-white shadow-md">
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#334155] bg-[#111827] px-3 py-2 text-xs text-[#94a3b8]">
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        Search your vault…
      </div>
      <div className="space-y-1.5">
        {VAULT_ITEMS.slice(0, 4).map(([name, detail, type], index) => (
          <div
            key={name}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg px-3 py-2",
              index === 1 ? "bg-[#4f46e5]" : "bg-[#111827]",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{name}</p>
              <p className="truncate font-mono text-[10px] text-[#cbd5e1]">
                {detail}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[9px] text-[#e2e8f0]">
              {type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MarketingHome() {
  return (
    <div className="marketing-page min-h-screen bg-background text-foreground">
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-border/70">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:px-12 lg:pb-24 lg:pt-24">
            <div className="relative z-10 max-w-2xl">
              <h1 className="max-w-xl text-balance text-4xl font-bold leading-[1.02] tracking-[-0.05em] text-foreground min-[420px]:text-5xl sm:text-6xl lg:text-[clamp(3.25rem,5.2vw,4.5rem)]">
                The secure home for everything you need to remember.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-text-secondary">
                Keep passwords, private notes and files together—easy to find and
                encrypted on your device.
              </p>
              <div className="mt-8 flex items-center">
                <Link
                  href="/sign-up"
                  className={buttonVariants({
                    variant: "primary",
                    size: "lg",
                    className: "group min-w-48",
                  })}
                >
                  Create a free vault
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              </div>
              <p className="mt-3 text-sm text-text-muted">
                Free to start. No card required.
              </p>
            </div>

            <div className="relative min-w-0">
              <Image
                src="/marketing/kryvex-vault-hero.png"
                alt="Kryvex vault showing searchable credentials and a masked password"
                width={1536}
                height={1024}
                priority
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="h-auto w-full rounded-3xl border border-border object-cover object-center shadow-lg"
              />
            </div>
          </div>
        </section>

        <section id="product" className="scroll-mt-24 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="max-w-2xl">
              <Eyebrow>From scattered to simple</Eyebrow>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Less hunting. More doing.
              </h2>
              <p className="mt-4 text-lg leading-8 text-text-secondary">
                Stop juggling browser passwords, scattered notes, files and
                recovery codes. Find everything in one searchable, private vault.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface-2 p-6 sm:p-8">
                <p className="text-lg font-semibold">Before</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Important information is scattered everywhere.
                </p>
                <div className="mt-7 space-y-3">
                  {BEFORE_ITEMS.map(([title, description, Icon]) => (
                    <div
                      key={title}
                      className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8">
                <p className="text-lg font-semibold">After</p>
                <p className="mt-1 text-sm text-text-secondary">
                  Everything you need, right where you expect it.
                </p>
                <div className="mt-7 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-text-muted">
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search your vault…
                  </div>
                  <div className="divide-y divide-border">
                    {VAULT_ITEMS.map(([name, detail, type]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{name}</p>
                          <p className="truncate font-mono text-xs text-text-secondary">
                            {detail}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                          {type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 grid gap-12 lg:grid-cols-3">
              <article>
                <Eyebrow>01 · Find in seconds</Eyebrow>
                <h3 className="mt-3 text-2xl font-bold tracking-tight">
                  Instant search, real productivity.
                </h3>
                <p className="mt-3 leading-7 text-text-secondary">
                  Quickly find any item and filter by type or tags—without digging
                  through folders.
                </p>
                <div className="mt-6">
                  <MiniVaultList />
                </div>
              </article>

              <article>
                <Eyebrow>02 · More than passwords</Eyebrow>
                <h3 className="mt-3 text-2xl font-bold tracking-tight">
                  A home for all your important things.
                </h3>
                <p className="mt-3 leading-7 text-text-secondary">
                  Store logins, secure notes, cards, identity documents,
                  developer keys, recovery codes and files.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {ITEM_TYPES.slice(0, 6).map(([label, Icon]) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article>
                <Eyebrow>03 · Ready wherever you are</Eyebrow>
                <h3 className="mt-3 text-2xl font-bold tracking-tight">
                  Your vault, across your devices.
                </h3>
                <p className="mt-3 leading-7 text-text-secondary">
                  Use the web vault today. Native mobile apps are in progress,
                  built on the same encrypted data model.
                </p>
                <Image
                  src="/marketing/kryvex-cross-device.png"
                  alt="Kryvex vault adapted for desktop, tablet and phone"
                  width={1536}
                  height={1024}
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="mt-6 h-auto w-full rounded-2xl border border-border object-cover shadow-sm"
                />
              </article>
            </div>
          </div>
        </section>

        <section
          id="security"
          className="scroll-mt-20 border-y border-border-strong bg-[#080b14] py-20 text-[#f8fafc] sm:py-24"
        >
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
            <div className="max-w-xl">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#818cf8]">
                Zero-knowledge encryption
              </p>
              <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Privacy is the architecture, not a setting.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#94a3b8]">
                Your vault contents are encrypted on your device before being
                stored. Firebase receives only unreadable encrypted data, while
                signing in and unlocking your vault remain separate actions.
              </p>
              <Link
                href="/sign-up"
                className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#334155] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[#818cf8] hover:bg-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#818cf8]"
              >
                Create a free vault
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <ol className="grid gap-5 sm:grid-cols-3">
              {([
                ["Encrypted on your device", "Vault content is encrypted locally before it leaves your device.", Laptop],
                ["Stored as encrypted data", "The server stores encrypted records and never needs readable vault contents.", ShieldCheck],
                ["Only you can unlock it", "Your master password derives the key that unlocks your vault.", UserRound],
              ] as const).map(([title, description, Icon], index) => (
                <li key={title as string} className="relative rounded-2xl border border-[#273449] bg-[#111827] p-6">
                  <span className="font-mono text-xs text-[#818cf8]">0{index + 1}</span>
                  <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#1e293b] text-[#818cf8]">
                    <Icon className="h-6 w-6" strokeWidth={1.7} aria-hidden="true" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{title as string}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#94a3b8]">
                    {description as string}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
            <Eyebrow>A simpler secure workflow</Eyebrow>
            <h2 className="mt-4 text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              From locked to what you need in three calm steps.
            </h2>

            <ol className="mt-12 grid gap-5 lg:grid-cols-3">
              {([
                ["Unlock", "Sign in, then unlock your vault locally with your master password.", LockKeyhole],
                ["Find", "Search or browse the item you need in your organized vault.", FolderSearch2],
                ["Reveal or copy", "View details only when needed, then copy with one clear action.", Copy],
              ] as const).map(([title, description, Icon], index) => (
                <li key={title as string} className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="mt-7 text-xl font-semibold">{title as string}</h3>
                  <p className="mt-2 leading-7 text-text-secondary">
                    {description as string}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-y border-border bg-surface-2 py-20 sm:py-24">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-12">
            <div>
              <Eyebrow>Everything you can store</Eyebrow>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Keep your digital life organized and accessible.
              </h2>
              <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
                {ITEM_TYPES.map(([label, Icon]) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary shadow-sm">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="self-center rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Smartphone className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-2xl font-bold">Designed to travel with you.</h3>
              <p className="mt-3 leading-7 text-text-secondary">
                The shared encryption and vault foundations already support web
                and mobile development. Web release comes first; the native apps
                follow after mobile-specific security hardening.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium text-text-secondary">
                <span className="rounded-md border border-border px-3 py-2">Web · current focus</span>
                <span className="rounded-md border border-border px-3 py-2">iOS · in progress</span>
                <span className="rounded-md border border-border px-3 py-2">Android · in progress</span>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="max-w-2xl">
              <Eyebrow>Frequently asked questions</Eyebrow>
              <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
                Common questions, clear answers.
              </h2>
            </div>

            <div className="mt-10 grid gap-3 lg:grid-cols-2">
              {FAQS.map(({ question, answer }) => (
                <details
                  key={question}
                  className="group rounded-xl border border-border bg-card px-5 open:shadow-sm"
                >
                  <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold marker:content-none">
                    {question}
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-text-muted transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="border-t border-border pb-5 pt-4 text-sm leading-6 text-text-secondary">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20 sm:pb-24">
          <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12">
            <div className="flex flex-col justify-between gap-8 rounded-3xl border border-primary/20 bg-primary/5 p-8 sm:p-10 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <h2 className="text-balance text-3xl font-bold tracking-[-0.035em] sm:text-4xl">
                  A safer, simpler way to keep what matters close.
                </h2>
                <p className="mt-3 text-text-secondary">
                  Create your free vault and take control of your digital life.
                </p>
              </div>
              <div className="shrink-0">
                <Link
                  href="/sign-up"
                  className={buttonVariants({ variant: "primary", size: "lg" })}
                >
                  Create a free vault
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <p className="mt-3 text-center text-xs text-text-muted">
                  Free to start. No card required.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-12">
          <div>
            <Logo markSize={30} />
            <p className="mt-4 max-w-xs text-sm leading-6 text-text-secondary">
              A zero-knowledge encrypted personal vault for a more private and
              organized digital life.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold">Product</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-text-secondary">
              <a href="#product" className="hover:text-foreground">Overview</a>
              <a href="#workflow" className="hover:text-foreground">How it works</a>
              <a href="#security" className="hover:text-foreground">Security</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Learn</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-text-secondary">
              <a href="#faq" className="hover:text-foreground">FAQ</a>
              <a href="#product" className="hover:text-foreground">What you can store</a>
              <a href="#security" className="hover:text-foreground">Privacy model</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold">Account</p>
            <div className="mt-4 flex flex-col gap-3 text-sm text-text-secondary">
              <Link href="/sign-up" className="hover:text-foreground">Create a free vault</Link>
              <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
              <Link href="/recover" className="hover:text-foreground">Recover access</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
            <p>© 2026 Kryvex. All rights reserved.</p>
            <p>Your vault contents are encrypted before leaving your device.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
