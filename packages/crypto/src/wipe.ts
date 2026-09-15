/**
 * Best-effort zeroing of raw key-material buffers once they're no longer
 * needed — see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §7. This is defense-in-
 * depth, not a guarantee: JS has no secure-erase primitive, so a buffer may
 * already have been copied elsewhere (e.g. into a WASM/Argon2id internal
 * buffer we don't control) before this runs, and the GC can still leave
 * stale copies in memory pages. It shrinks the window a memory-scraping
 * attack has, nothing more.
 */
export function wipeBytes(buffer: Uint8Array): void {
  buffer.fill(0);
}
