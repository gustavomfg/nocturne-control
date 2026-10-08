// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Entity001 from "./Entity001";

// Without WebGL2, ENTITY 001 falls back to its 2D drawing and keeps every control.
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Entity001 without WebGL2", () => {
  it("shows the 2D entity with a readout and the two controls", () => {
    render(<Entity001 />);
    expect(screen.getByRole("img", { name: /Entidade digital abstrata/ })).toBeTruthy();
    expect(screen.getByText("modo essencial", { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "som" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("disables the metamorphosis control in the fallback, where no sequence exists", () => {
    render(<Entity001 />);
    expect((screen.getByRole("button", { name: "metamorfose" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the audio toggle silent when Web Audio is missing", async () => {
    vi.stubGlobal("AudioContext", undefined);
    render(<Entity001 />);
    fireEvent.click(screen.getByRole("button", { name: "som" }));
    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: "som" }).getAttribute("aria-pressed")).toBe("false");
    });
  });
});
