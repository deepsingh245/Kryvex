"use strict";
/**
 * Non-secret account/profile document — see docs/DATA_MODEL.md §4.
 * Created at signup with a subset of fields (uid/email/kdfSalt/kdfParams/
 * createdAt/settings); protectedVaultKey is added starting Phase 3, once a
 * Vault Encryption Key exists to wrap. The profile document is updated, not
 * recreated, when that happens.
 */
Object.defineProperty(exports, "__esModule", { value: true });
