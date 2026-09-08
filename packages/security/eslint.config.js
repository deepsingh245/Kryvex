import config from "@kryvex/eslint-config";

// packages/security is the one sanctioned place that may call console.* —
// it's what secureLogger wraps. Every other package/app keeps `no-console: error`.
// See docs/DEVELOPMENT.md §6 / CLAUDE.md §3.
export default [...config, { rules: { "no-console": "off" } }];
