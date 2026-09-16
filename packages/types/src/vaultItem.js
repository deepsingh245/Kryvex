"use strict";
/**
 * Vault item types — see docs/DATA_MODEL.md §1-2. `VaultItemDocument` is the
 * plaintext Firestore envelope (server-visible); `ItemContent` variants are
 * the decrypted payload shape, never stored or transmitted in the clear.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITEM_TYPES = void 0;
exports.ITEM_TYPES = [
    "login",
    "email",
    "secureNote",
    "identity",
    "card",
    "pin",
    "apiKey",
    "recoveryCodes",
    "image",
    "pdf",
    "file",
    "custom",
];
