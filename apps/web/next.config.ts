import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // allowedDevOrigins: ["e97f-117-242-47-49.ngrok-free.app"],
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
    "@kryvex/crypto",
    "@kryvex/vault",
  ],
  // Static security headers only. A Content-Security-Policy is deliberately
  // NOT set here yet: it must allow Next's inline bootstrap scripts, Firebase
  // Auth/Firestore/Storage/Functions endpoints, reCAPTCHA (App Check), and
  // blob: URLs for attachment previews, and needs verifying in a real browser
  // against the deployed site first — see docs/DEPLOYMENT.md §12.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
