import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import VaultLayout from "./layout";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

function mockVault(overrides: Partial<ReturnType<typeof useVault>> = {}) {
  mockedUseVault.mockReturnValue({
    state: { status: "SIGNED_OUT" },
    signUp: vi.fn(),
    signIn: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    recoverVault: vi.fn(),
    settings: undefined,
    updateSettings: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  });
}

describe("VaultLayout", () => {
  it("redirects to /welcome when SIGNED_OUT", () => {
    mockVault({ state: { status: "SIGNED_OUT" } });
    render(
      <VaultLayout>
        <p>content</p>
      </VaultLayout>,
    );
    expect(replace).toHaveBeenCalledWith("/welcome");
  });

  it("redirects to /unlock when AUTHENTICATED_LOCKED", () => {
    mockVault({
      state: {
        status: "AUTHENTICATED_LOCKED",
        user: { uid: "1", email: "a@b.com" },
      },
    });
    render(
      <VaultLayout>
        <p>content</p>
      </VaultLayout>,
    );
    expect(replace).toHaveBeenCalledWith("/unlock");
  });

  it("renders the sidebar and children when UNLOCKED", () => {
    mockVault({
      state: {
        status: "UNLOCKED",
        user: { uid: "1", email: "a@b.com" },
        stretchedMasterKey: new Uint8Array(),
        vaultEncryptionKey: new Uint8Array(),
      },
    });
    render(
      <VaultLayout>
        <p>vault content</p>
      </VaultLayout>,
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("vault content")).toBeInTheDocument();
    expect(screen.getByText("All Items")).toBeInTheDocument();
    expect(screen.getByText("Lock Vault")).toBeInTheDocument();
  });

  it("does not render children while UNLOCKING", () => {
    mockVault({
      state: {
        status: "UNLOCKING",
        user: { uid: "1", email: "a@b.com" },
      },
    });
    render(
      <VaultLayout>
        <p>vault content</p>
      </VaultLayout>,
    );
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText("vault content")).not.toBeInTheDocument();
  });
});
