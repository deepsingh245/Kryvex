import { fireEvent, render, screen } from "@testing-library/react-native";
import { ItemForm } from "./ItemForm";

describe("ItemForm", () => {
  it("renders the base fields plus the type's fixed fields for a login item", async () => {
    await render(
      <ItemForm type="login" onSubmit={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(screen.getByLabelText("Title")).toBeTruthy();
    expect(screen.getByText("Password")).toBeTruthy();
    expect(screen.getByLabelText("Notes")).toBeTruthy();
  });

  it("submits valid content matching itemContentSchema", async () => {
    const onSubmit = jest.fn();
    await render(
      <ItemForm type="login" onSubmit={onSubmit} onCancel={jest.fn()} />,
    );

    await fireEvent.changeText(screen.getByLabelText("Title"), "My Login");
    await fireEvent.changeText(screen.getByLabelText("Password"), "hunter2");

    await fireEvent.press(screen.getByText("Save"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const content = onSubmit.mock.calls[0]![0];
    expect(content).toMatchObject({
      type: "login",
      title: "My Login",
      password: "hunter2",
    });
  });

  it("surfaces a validation error and does not submit when a required field is missing", async () => {
    const onSubmit = jest.fn();
    await render(
      <ItemForm type="login" onSubmit={onSubmit} onCancel={jest.fn()} />,
    );
    // Title (required by itemContentSchema) is left blank.
    await fireEvent.press(screen.getByText("Save"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Title is required.")).toBeTruthy();
  });
});
