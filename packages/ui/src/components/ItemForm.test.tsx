import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ItemForm } from "./ItemForm";

describe("ItemForm", () => {
  it("renders the base fields plus the type's fixed fields for a login item", () => {
    render(<ItemForm type="login" onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByText("Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });

  it("submits valid content matching itemContentSchema", () => {
    const onSubmit = vi.fn();
    render(<ItemForm type="login" onSubmit={onSubmit} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My Login" },
    });

    const passwordInput = screen
      .getByText("Password")
      .parentElement!.querySelector("input")!;
    fireEvent.change(passwordInput, { target: { value: "hunter2" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const content = onSubmit.mock.calls[0]![0];
    expect(content).toMatchObject({
      type: "login",
      title: "My Login",
      password: "hunter2",
    });
  });

  it("surfaces a validation error and does not submit when a required field is missing", () => {
    const onSubmit = vi.fn();
    render(<ItemForm type="login" onSubmit={onSubmit} onCancel={vi.fn()} />);
    // Title (required by itemContentSchema) is left blank.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
