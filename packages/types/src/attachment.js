"use strict";
/**
 * Attachment document — see docs/DATA_MODEL.md §3. The plaintext Firestore
 * envelope for a file's metadata + wrapped DEK; the actual ciphertext blob
 * lives in Firebase Storage at `storagePath`, never inline here.
 */
Object.defineProperty(exports, "__esModule", { value: true });
