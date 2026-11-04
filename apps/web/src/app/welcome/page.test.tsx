import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WelcomePage from "./page";

describe("WelcomePage", () => {
  it("shows the public marketing value proposition", () => {
    render(<WelcomePage />);
    expect(
      screen.getByRole("heading", {
        name: "The secure home for everything you need to remember.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Privacy is the architecture, not a setting.")).toBeInTheDocument();
  });

  it("links every primary conversion action to /sign-up", () => {
    render(<WelcomePage />);
    const links = screen.getAllByRole("link", { name: /Create a free vault/i });
    expect(links.length).toBeGreaterThan(1);
    for (const link of links) expect(link).toHaveAttribute("href", "/sign-up");
  });

  it("links sign in to /sign-in", () => {
    render(<WelcomePage />);
    const links = screen.getAllByRole("link", { name: "Sign in" });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute("href", "/sign-in");
  });
});
