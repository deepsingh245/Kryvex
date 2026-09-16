/**
 * Vault item types — see docs/DATA_MODEL.md §1-2. `VaultItemDocument` is the
 * plaintext Firestore envelope (server-visible); `ItemContent` variants are
 * the decrypted payload shape, never stored or transmitted in the clear.
 */
import type { EncryptedEnvelope } from "./userProfile";
export declare const ITEM_TYPES: readonly ["login", "email", "secureNote", "identity", "card", "pin", "apiKey", "recoveryCodes", "image", "pdf", "file", "custom"];
export type ItemType = (typeof ITEM_TYPES)[number];
export type CustomFieldType = "text" | "secret" | "url" | "email" | "number" | "date" | "multiline" | "boolean" | "totp";
export interface CustomField {
    id: string;
    label: string;
    type: CustomFieldType;
    value: string;
}
export interface ItemContentBase {
    title: string;
    tags: string[];
    notes?: string | undefined;
    customFields: CustomField[];
}
export interface Address {
    line1: string;
    line2?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    postalCode?: string | undefined;
    country?: string | undefined;
}
export interface LoginContent extends ItemContentBase {
    type: "login";
    username: string;
    password: string;
    websites: string[];
    totp?: {
        secret: string;
        issuer?: string | undefined;
        account?: string | undefined;
    } | undefined;
}
export interface EmailContent extends ItemContentBase {
    type: "email";
    email: string;
    password: string;
}
export interface SecureNoteContent extends ItemContentBase {
    type: "secureNote";
    body: string;
}
export interface IdentityContent extends ItemContentBase {
    type: "identity";
    fullName?: string | undefined;
    dateOfBirth?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    address?: Address | undefined;
    idNumbers?: CustomField[] | undefined;
}
export interface CardContent extends ItemContentBase {
    type: "card";
    cardholderName: string;
    number: string;
    expiry: string;
    cvv: string;
    pin?: string | undefined;
    brand?: string | undefined;
}
export interface PinContent extends ItemContentBase {
    type: "pin";
    value: string;
}
export interface ApiKeyContent extends ItemContentBase {
    type: "apiKey";
    service: string;
    key: string;
    token?: string | undefined;
    endpoint?: string | undefined;
}
export interface RecoveryCodesContent extends ItemContentBase {
    type: "recoveryCodes";
    service: string;
    codes: {
        code: string;
        used: boolean;
    }[];
}
export interface AttachmentItemContent extends ItemContentBase {
    type: "image" | "pdf" | "file";
    attachmentId: string;
}
export interface CustomItemContent extends ItemContentBase {
    type: "custom";
}
export type ItemContent = LoginContent | EmailContent | SecureNoteContent | IdentityContent | CardContent | PinContent | ApiKeyContent | RecoveryCodesContent | AttachmentItemContent | CustomItemContent;
export interface VaultItemDocument {
    id: string;
    ownerId: string;
    type: ItemType;
    revision: number;
    updatedAt: unknown;
    createdAt: unknown;
    deleted: boolean;
    favorite: boolean;
    wrappedItemKey: EncryptedEnvelope;
    encryptedData: EncryptedEnvelope;
    attachmentRefs: string[];
}
//# sourceMappingURL=vaultItem.d.ts.map