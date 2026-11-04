import { fireEvent, render, screen } from "@testing-library/react-native";
import { EmergencyKit } from "./EmergencyKit";

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));

const KEY = "ABCD-EF01-2345-6789";

describe("EmergencyKit", () => {
  it("shows the Recovery Key", async () => {
    await render(<EmergencyKit recoveryKey={KEY} onContinue={jest.fn()} />);
    expect(screen.getByTestId("recovery-key")).toHaveTextContent(KEY);
  });

  it("won't continue until the user acknowledges", async () => {
    const onContinue = jest.fn();
    await render(<EmergencyKit recoveryKey={KEY} onContinue={onContinue} />);

    await fireEvent.press(screen.getByText("Continue"));
    expect(onContinue).not.toHaveBeenCalled();

    await fireEvent(screen.getByTestId("kit-acknowledge"), "valueChange", true);
    await fireEvent.press(screen.getByText("Continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
