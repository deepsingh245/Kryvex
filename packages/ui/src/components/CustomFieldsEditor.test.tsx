import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomFieldsEditor } from "./CustomFieldsEditor";

describe("CustomFieldsEditor", () => {
  it("labels the per-row label input and type select for assistive tech", () => {
    render(
      <CustomFieldsEditor
        fields={[{ id: "1", label: "API Key", type: "text", value: "abc" }]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Custom field label")).toHaveValue("API Key");
    expect(screen.getByLabelText("Custom field type")).toHaveValue("text");
  });

  it("renders a labeled row for each field", () => {
    render(
      <CustomFieldsEditor
        fields={[
          { id: "1", label: "A", type: "text", value: "a" },
          { id: "2", label: "B", type: "secret", value: "b" },
        ]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByLabelText("Custom field label")).toHaveLength(2);
    expect(screen.getAllByLabelText("Custom field type")).toHaveLength(2);
  });
});
