// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App.tsx";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Solaris instrument", () => {
  it("renders the instrument and its primary interaction cues", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Move through light." })).toBeTruthy();
    expect(screen.getByLabelText("Instrumento visual interativo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "PRISM" })).toBeTruthy();
  });

  it("switches palettes and updates the visible composition label", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "SOL" }));

    expect(screen.getByText("composition / SOL")).toBeTruthy();
    expect(screen.getByText("warm / kinetic")).toBeTruthy();
  });

  it("changes intensity and opts into sound only after an explicit click", async () => {
    const user = userEvent.setup();
    render(<App />);

    const slider = screen.getByRole("slider", { name: "intensity" });
    await user.click(slider);
    await user.click(screen.getByRole("button", { name: /add sound/ }));

    expect(screen.getByRole("button", { name: /add sound|sound on/ })).toBeTruthy();
  });
});
