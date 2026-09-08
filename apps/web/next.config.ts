import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every workspace package apps/web actually imports — see
  // docs/ARCHITECTURE.md §4 and docs/DEVELOPMENT.md for the known Turbopack
  // caveat: if `next dev --turbopack` fails to resolve one of these, fall
  // back to plain `next dev` (webpack) rather than silently working around it.
  transpilePackages: [
    "@kryvex/types",
    "@kryvex/ui",
    "@kryvex/firebase",
    "@kryvex/validation",
    "@kryvex/security",
  ],
};

export default nextConfig;
