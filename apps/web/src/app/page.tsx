import { KRYVEX_BRAND_COLOR } from "@kryvex/ui";

/**
 * Phase 1 placeholder only — proves apps/web resolves and renders a
 * workspace package (@kryvex/ui) end-to-end. No vault UI, no auth
 * (Phase 2-4 work). See docs/ARCHITECTURE.md §5 for the real screen map.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <h1
        className="text-2xl font-semibold"
        style={{ color: KRYVEX_BRAND_COLOR }}
      >
        Kryvex is scaffolded
      </h1>
      <p className="text-sm text-gray-500">
        Phase 1 foundation — no vault UI yet.
      </p>
    </main>
  );
}
