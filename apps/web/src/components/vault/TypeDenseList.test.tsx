import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { TypeDenseList } from "./TypeDenseList";

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

function baseItem(overrides: Partial<DecryptedVaultItem>): DecryptedVaultItem {
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

describe("TypeDenseList", () => {
  it("renders an email item's Email and Password inline with working Copy buttons", async () => {
    stubClipboard();
    render(<TypeDenseList items={[baseItem({})]} onToggleFavorite={vi.fn()} />);
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
    expect(screen.getByLabelText("Password")).toHaveValue("hunter2");
    expect(screen.getByText("Personal email")).toBeInTheDocument();

    const copyButtons = screen.getAllByRole("button", { name: "Copy" });
    fireEvent.click(copyButtons[0]!);
    await vi.waitFor(() => {
      expect(screen.getAllByRole("status")[0]).toHaveTextContent("Copied");
    });
  });

  it("renders a login item's Username and Password inline", () => {
    stubClipboard();
    render(
      <TypeDenseList
        items={[
          baseItem({
            type: "login",
            content: {
              type: "login",
              title: "GitHub",
              tags: [],
              customFields: [],
              username: "alice",
              password: "hunter2",
              websites: ["https://github.com"],
            },
          }),
        ]}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Username")).toHaveValue("alice");
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders any other category from its field config (e.g. a card's number and expiry)", () => {
    stubClipboard();
    render(
      <TypeDenseList
        items={[
          baseItem({
            type: "card",
            content: {
              type: "card",
              title: "Visa",
              tags: [],
              customFields: [],
              cardholderName: "Alice",
              number: "4111111111111111",
              expiry: "12/30",
              cvv: "123",
            },
          }),
        ]}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Cardholder name")).toHaveValue("Alice");
    expect(screen.getByLabelText("Card number")).toBeInTheDocument();
    expect(screen.getByLabelText("Expiry (MM/YY)")).toHaveValue("12/30");
  });

  it("renders secret custom fields with a reveal field", () => {
    stubClipboard();
    render(
      <TypeDenseList
        items={[
          baseItem({
            type: "custom",
            content: {
              type: "custom",
              title: "Router",
              tags: [],
              customFields: [
                {
                  id: "f1",
                  label: "Admin password",
                  type: "secret",
                  value: "s3cret",
                },
              ],
            },
          }),
        ]}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Admin password")).toBeInTheDocument();
  });

  it("falls back to the normal item row for a decrypt-failed item", () => {
    render(
      <TypeDenseList
        items={[baseItem({ decryptFailed: true, content: undefined } as never)]}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("Unable to decrypt")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("falls back to the normal item row for attachment items (image/pdf/file)", () => {
    render(
      <TypeDenseList
        items={[
          baseItem({
            type: "image",
            content: {
              type: "image",
              title: "Passport photo",
              tags: [],
              customFields: [],
              attachmentId: "att1",
            },
          }),
        ]}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("Passport photo")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Copy" }),
    ).not.toBeInTheDocument();
  });
});
