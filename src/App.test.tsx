// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
beforeEach(() => { vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("Solaris experience", () => {
  it("keeps the instrument usable when graphics are unavailable", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "O invisível, em movimento." })).toBeTruthy();
    expect(screen.getByLabelText("Instrumento visual interativo")).toBeTruthy();
    expect(screen.getByRole("button", { name: "PRISM" })).toBeTruthy();
  });
  it("changes atmosphere and intensity with visible feedback", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: "SOL" }));
    expect(screen.getByText("Composição / SOL")).toBeTruthy();
    expect(screen.getByText("calor em movimento")).toBeTruthy();
    fireEvent.change(screen.getByRole("slider", { name: "Intensidade" }), { target: { value: "80" } });
    expect(screen.getByText("80%")).toBeTruthy();
  });
  it("Space activates a focused palette button without enabling audio", async () => {
    const user = userEvent.setup(); render(<App />);
    const palette = screen.getByRole("button", { name: "VIOLET" }); palette.focus();
    await user.keyboard(" ");
    expect(palette.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Ativar som" }).getAttribute("aria-pressed")).toBe("false");
  });
  it("Escape exits the CSS fullscreen fallback and restores scrolling", async () => {
    const user = userEvent.setup(); render(<App />);
    await user.click(screen.getByRole("button", { name: "Expandir experiência" }));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Expandir experiência" }).getAttribute("aria-pressed")).toBe("false");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
  it("deduplicates pending audio and cancels it when the page unmounts", async () => {
    let finishResume = () => {};
    const close = vi.fn(() => Promise.resolve());
    const createOscillator = vi.fn();
    const construct = vi.fn();
    vi.stubGlobal("AudioContext", class {
      constructor() { construct(); }
      resume() { return new Promise<void>(resolve => { finishResume = resolve; }); }
      close = close;
      createOscillator = createOscillator;
    });
    const user = userEvent.setup(); const view = render(<App />);
    await user.click(screen.getByRole("button", { name: "Ativar som" }));
    await user.click(screen.getByRole("button", { name: "Ativar som" }));
    expect(construct).toHaveBeenCalledTimes(1);
    view.unmount();
    expect(close).toHaveBeenCalledTimes(1);
    await act(async () => finishResume());
    expect(createOscillator).not.toHaveBeenCalled();
  });

});
