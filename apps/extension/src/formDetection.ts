export type CredentialFormKind = "signin" | "signup" | "password-change";

export interface PasswordFieldSnapshot {
  value: string;
  autocomplete: string;
}

export interface ClassifiedPassword {
  kind: CredentialFormKind;
  password: string;
}

const EXCLUDED_AUTOCOMPLETE_TOKENS = new Set([
  "one-time-code",
  "cc-number",
  "cc-csc",
  "cc-exp",
  "cc-exp-month",
  "cc-exp-year",
  "transaction-amount",
  "transaction-currency",
  "webauthn",
]);

function autocompleteTokens(value: string): string[] {
  return value.toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function hasExcludedAutocomplete(value: string): boolean {
  return autocompleteTokens(value).some((token) =>
    EXCLUDED_AUTOCOMPLETE_TOKENS.has(token),
  );
}

/** Pure classifier kept separate from DOM traversal for deterministic tests. */
export function classifyPasswordFields(
  fields: readonly PasswordFieldSnapshot[],
): ClassifiedPassword | null {
  const populated = fields.filter(
    (field) =>
      field.value.length > 0 && !hasExcludedAutocomplete(field.autocomplete),
  );
  if (populated.length === 0) return null;

  const current = populated.filter(
    (field) => field.autocomplete === "current-password",
  );
  const next = populated.filter(
    (field) => field.autocomplete === "new-password",
  );

  if (next.length > 0) {
    if (current.length > 1) return null;
    const proposed = next[0]?.value;
    if (!proposed || !next.every((field) => field.value === proposed)) {
      return null;
    }
    return {
      kind: current.length > 0 ? "password-change" : "signup",
      password: proposed,
    };
  }

  if (populated.length === 1) {
    return { kind: "signin", password: populated[0]!.value };
  }

  const unique = new Set(populated.map((field) => field.value));
  if (unique.size === 1 && populated.length === 2) {
    return { kind: "signup", password: populated[0]!.value };
  }

  return null;
}

function isUsableInput(input: HTMLInputElement): boolean {
  return !input.disabled && !input.readOnly && input.value.length > 0;
}

export function isEligiblePasswordInput(input: HTMLInputElement): boolean {
  if (
    input.disabled ||
    input.readOnly ||
    hasExcludedAutocomplete(input.autocomplete)
  ) {
    return false;
  }
  const hints = [
    input.name,
    input.id,
    input.placeholder,
    input.getAttribute("aria-label") ?? "",
  ].join(" ");
  return !/(?:\botp\b|one[ -]?time|verification[ -]?code|\bpin\b|\bcvv\b|\bcvc\b|security[ -]?code|passkey)/i.test(
    hints,
  );
}

function findUsernameInput(scope: ParentNode): HTMLInputElement | null {
  const inputs = Array.from(scope.querySelectorAll<HTMLInputElement>("input"));
  return (
    inputs.find(
      (input) =>
        isUsableInput(input) && input.autocomplete.toLowerCase() === "username",
    ) ??
    inputs.find(
      (input) =>
        isUsableInput(input) &&
        (input.autocomplete.toLowerCase() === "email" ||
          input.type === "email"),
    ) ??
    inputs.find(
      (input) =>
        isUsableInput(input) &&
        /(?:user|login|email|account)/i.test(`${input.name} ${input.id}`) &&
        input.type !== "password",
    ) ??
    null
  );
}

export interface CapturedCredential {
  username: string;
  password: string;
  kind: CredentialFormKind;
}

export function captureCredentialFromScope(
  scope: ParentNode,
): CapturedCredential | null {
  const passwordInputs = Array.from(
    scope.querySelectorAll<HTMLInputElement>('input[type="password"]'),
  ).filter((input) => isUsableInput(input) && isEligiblePasswordInput(input));
  const classified = classifyPasswordFields(
    passwordInputs.map((input) => ({
      value: input.value,
      autocomplete: input.autocomplete.toLowerCase(),
    })),
  );
  if (!classified) return null;

  const usernameInput = findUsernameInput(scope);
  return {
    username: usernameInput?.value.trim() ?? "",
    password: classified.password,
    kind: classified.kind,
  };
}

export function findCredentialScope(target: Element): ParentNode {
  return target.closest("form") ?? target.ownerDocument;
}
