import { render, screen } from "@testing-library/react-native";
import HomeScreen from "./index";

describe("HomeScreen (Phase 1 placeholder)", () => {
  it("renders the scaffold message", async () => {
    // @testing-library/react-native@14's render() is async — see
    // https://callstack.github.io/react-native-testing-library/docs/upgrade-guides/14.0.
    await render(<HomeScreen />);
    expect(screen.getByText("Kryvex is scaffolded")).toBeTruthy();
  });
});
