const PLAINTEXT_FIELD_NAMES = new Set([
  "password",
  "masterPassword",
  "authSecret",
  "username",
  "vaultEncryptionKey",
]);

/** Fails closed if a future persistent record accidentally gains secret fields. */
export function assertEncryptedPersistenceValue(
  value: unknown,
  path = "record",
): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertEncryptedPersistenceValue(entry, `${path}[${index}]`),
    );
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (PLAINTEXT_FIELD_NAMES.has(key)) {
      throw new Error(
        `Refusing to persist a plaintext credential field at ${path}.`,
      );
    }
    assertEncryptedPersistenceValue(child, `${path}.${key}`);
  }
}
