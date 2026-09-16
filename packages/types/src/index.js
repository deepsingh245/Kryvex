"use strict";
/**
 * Domain types shared across the monorepo. Auth/profile types exist as of
 * Phase 2; vault item types (VaultItemDocument, ItemContent variants — see
 * docs/DATA_MODEL.md) as of Phase 4. AttachmentDocument (docs/DATA_MODEL.md
 * §3) as of Phase 6.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PHASE_1_MARKER = exports.ITEM_TYPES = void 0;
var vaultItem_1 = require("./vaultItem");
Object.defineProperty(exports, "ITEM_TYPES", { enumerable: true, get: function () { return vaultItem_1.ITEM_TYPES; } });
exports.PHASE_1_MARKER = {
    phase: 1,
    label: "foundation-scaffold",
};
