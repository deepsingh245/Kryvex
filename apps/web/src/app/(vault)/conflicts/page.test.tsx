import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConflictsPage from "./page";
import { useVaultItems } from "@/hooks/useVaultItems";

vi.mock("@/hooks/useVaultItems", () => ({
  useVaultItems: vi.fn(),
}));

const mockedUseVaultItems = vi.mocked(useVaultItems);

describe("ConflictsPage", () => {
  it("shows a no-conflicts message when there are none", () => {
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      loadError: null,
      isOnline: true,
      conflicts: [],
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      resolveConflict: vi.fn(),
    });
    render(<ConflictsPage />);
    expect(screen.getByText("No conflicts to review.")).toBeInTheDocument();
  });

  it("renders both versions and calls resolveConflict for each action", () => {
    const resolveConflict = vi.fn();
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      loadError: null,
      isOnline: true,
      conflicts: [
        {
          itemId: "item1",
          localContent: {
            type: "login",
            title: "Mine",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
          serverContent: {
            type: "login",
            title: "Server's",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
        },
      ],
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      resolveConflict,
    });
    render(<ConflictsPage />);

    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByText("Server's")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Keep mine"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepMine");

    fireEvent.click(screen.getByText("Keep server's"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepServer");

    fireEvent.click(screen.getByText("Keep both"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepBoth");
  });

  it("surfaces an error when resolving a conflict fails", async () => {
    const resolveConflict = vi.fn().mockRejectedValue(new Error("boom"));
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      loadError: null,
      isOnline: true,
      conflicts: [
        {
          itemId: "item1",
          localContent: {
            type: "login",
            title: "Mine",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
          serverContent: {
            type: "login",
            title: "Server's",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
        },
      ],
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      resolveConflict,
    });
    render(<ConflictsPage />);

    fireEvent.click(screen.getByText("Keep mine"));

    expect(
      await screen.findByText(
        "Unable to resolve that conflict. Please try again.",
      ),
    ).toBeInTheDocument();
  });
});
