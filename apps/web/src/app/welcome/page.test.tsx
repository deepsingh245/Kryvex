import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import WelcomePage from "./page";

describe("WelcomePage", () => {
  it("shows the Kryvex brand statement", () => {
    render(<WelcomePage />);
    expect(screen.getByText("Your private vault. Always.")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Store everything that matters" }),
    ).toBeInTheDocument();
  });

  it("links Get Started to /sign-up", () => {
    render(<WelcomePage />);
    expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("links the existing-account option to /sign-in", () => {
    render(<WelcomePage />);
    expect(
      screen.getByRole("link", { name: "I already have an account" }),
    ).toHaveAttribute("href", "/sign-in");
  });
});
