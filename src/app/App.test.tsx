// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  window.location.hash = "#/entity-001";
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("OVRA shell", () => {
  it("shows the wordmark and a discreet experiment index", () => {
    render(<App />);
    expect(screen.getByText("OVRA")).toBeTruthy();
    const index = screen.getByRole("navigation", { name: "Experimentos" });
    expect(index.textContent).toContain("001");
  });

  it("loads the requested experiment lazily", async () => {
    render(<App />);
    expect(await screen.findByRole("region", { name: "ENTITY 001" })).toBeTruthy();
  });
});
