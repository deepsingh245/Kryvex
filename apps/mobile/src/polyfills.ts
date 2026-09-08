/**
 * Must be imported FIRST, before any @kryvex/crypto import — Hermes has no
 * crypto.getRandomValues, and @noble/hashes' randomBytes() throws rather
 * than silently degrading if it's missing. expo-standard-web-crypto wraps
 * the native module already present inside the Expo Go binary, so no
 * `expo prebuild` is needed. See docs/DEVELOPMENT.md / the Phase 2 plan for
 * why a WASM/native Argon2id isn't used here instead.
 */
import { polyfillWebCrypto } from "expo-standard-web-crypto";

polyfillWebCrypto();
