/**
 * Firebase Authentication identity only — never confused with vault
 * decryption. See docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.
 */
export interface AuthenticatedUser {
  uid: string;
  email: string;
}
