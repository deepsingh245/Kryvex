import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { CredentialTable } from "./CredentialTable";

const copyWithAutoClear = vi.fn().mockResolvedValue(undefined);
vi.mock("@kryvex/security", () => ({
  clipboard: {
    copyWithAutoClear: (...args: unknown[]) => copyWithAutoClear(...args),
  },
}));

const login = {
  id: "1",
  type: "login",
  favorite: false,
  deleted: false,
  decryptFailed: false,
  updatedAt: null,
  content: {
    type: "login",
    title: "GitHub",
    username: "alex@kryvex.dev",
    password: "hunter2-secret",
    websites: ["https://github.com/login"],
    tags: [],
    customFields: [],
  },
} as unknown as DecryptedVaultItem;

describe("CredentialTable", () => {
  it("shows title, username and host but never the password", () => {
    render(
      <CredentialTable
        items={[login]}
        selectedId={null}
        onSelect={() => {}}
        onToggleFavorite={() => {}}
      />,
    );
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("alex@kryvex.dev")).toBeInTheDocument();
    expect(screen.getByText("github.com")).toBeInTheDocument();
    expect(screen.queryByText("hunter2-secret")).not.toBeInTheDocument();
  });

  it("selects a row, copies via the auto-clearing path, and toggles favorite", () => {
    const onSelect = vi.fn();
    const onToggleFavorite = vi.fn();
    render(
      <CredentialTable
        items={[login]}
        selectedId={null}
        onSelect={onSelect}
        onToggleFavorite={onToggleFavorite}
        clipboardClearSeconds={10}
      />,
    );

    fireEvent.click(screen.getByText("GitHub"));
    expect(onSelect).toHaveBeenCalledWith("1");

    fireEvent.click(
      screen.getByRole("button", { name: "Copy password for GitHub" }),
    );
    expect(copyWithAutoClear).toHaveBeenCalledWith(
      expect.anything(),
      "hunter2-secret",
      10_000,
    );
    // Copying must not also select the row.
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Favorite" }));
    expect(onToggleFavorite).toHaveBeenCalledWith("1");
  });
});
