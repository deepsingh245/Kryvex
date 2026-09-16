// Relative import, not the "@kryvex/eslint-config" package name — see
// tsconfig.json's comment on why this package's package.json can't carry
// any workspace:*/catalog: entries.
import config from "../../packages/eslint-config/base.js";

export default config;
