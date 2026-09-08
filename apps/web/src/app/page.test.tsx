import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home (Phase 1 placeholder page)", () => {
  it("renders the scaffold message", () => {
    render(<Home />);
    expect(screen.getByText("Kryvex is scaffolded")).toBeInTheDocument();
  });
});
