import { render, screen } from "@testing-library/react-native";
import HomeScreen from "./index";

describe("HomeScreen (Phase 1 placeholder)", () => {
  it("renders the scaffold message", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Kryvex is scaffolded")).toBeTruthy();
  });
});
