import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { EmailDenseList } from "./EmailDenseList";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const readText = vi.fn().mockResolvedValue("");
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText, readText },
    configurable: true,
  });
  return { writeText, readText };
}

afterEach(() => {
  vi.restoreAllMocks();
});

function emailItem(overrides: Partial<DecryptedVaultItem> = {}): DecryptedVaultItem {
  return {
    id: "item1",
    ownerId: "1",
    type: "email",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: false,
    wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    attachmentRefs: [],
    decryptFailed: false,
    content: {
      type: "email",
      title: "Personal email",
      tags: [],
      customFields: [],
      email: "alice@example.com",
      password: "hunter2",
    },
    ...overrides,
  } as DecryptedVaultItem;
}

describe("EmailDenseList", () => {
  it("renders each item's Email and Password inline with working Copy buttons", async () => {
    stubClipboard();
    render(
      <EmailDenseList items={[emailItem()]} onToggleFavorite={vi.fn()} />,
    );
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("hunter2");
    expect(screen.getByText("Personal email")).toBeInTheDocument();

    const copyButtons = screen.getAllByRole("button", { name: "Copy" });
    fireEvent.click(copyButtons[0]!);
    await vi.waitFor(() => {
      expect(screen.getAllByRole("status")[0]).toHaveTextContent("Copied");
    });
  });

  it("falls back to the normal item row for a decrypt-failed item", () => {
    render(
      <EmailDenseList
        items={[emailItem({ decryptFailed: true, content: undefined } as never)]}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("Unable to decrypt")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });
});
