// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ParticlePassage } from "./ParticlePassage";

vi.mock("./CinematicField", () => ({
  CinematicField: ({ progression, frozen }: { progression: number; frozen: boolean }) => (
    <canvas data-testid="field" data-ready="true" data-progression={progression} data-frozen={String(frozen)} />
  ),
}));

let pageProgress = 0;
let pendingFrame: FrameRequestCallback | null = null;
const downloads: string[] = [];

beforeEach(() => {
  pageProgress = 0;
  pendingFrame = null;
  downloads.length = 0;
  vi.stubGlobal("innerHeight", 1000);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  vi.stubGlobal("scrollTo", vi.fn());
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { pendingFrame = callback; return 1; });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => { pendingFrame = null; });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const top = this.id === "passage" ? -pageProgress * 2000 : 0;
    return { top, height: 3000, bottom: top + 3000, left: 0, right: 1440, width: 1440, x: 0, y: top, toJSON: () => ({}) };
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(3000);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,c2NlbmU=");
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push(this.download);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function scrollToProgress(value: number) {
  act(() => {
    pageProgress = value;
    fireEvent.scroll(window);
    const callback = pendingFrame;
    pendingFrame = null;
    callback?.(0);
  });
}

describe("ParticlePassage", () => {
  it("holds the chapter, canvas and exported filename together until motion resumes", () => {
    render(<ParticlePassage accent="#ffffff" intensity={0.6} audioLevel={0} />);
    scrollToProgress(0.12);
    expect(screen.getByTestId("field").getAttribute("data-progression")).toBe("0.24");

    fireEvent.click(screen.getByRole("button", { name: "Congelar cena" }));
    scrollToProgress(0.82);

    expect(screen.getByTestId("field").getAttribute("data-frozen")).toBe("true");
    expect(screen.getByTestId("field").getAttribute("data-progression")).toBe("0.24");
    expect(screen.getByRole("button", { name: "Origem" }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("heading", { name: "O primeiro instante." })).toBeTruthy();
    expect((screen.getByRole("button", { name: "Dispersar" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Salvar imagem" }));
    expect(downloads).toEqual(["solaris-origem.png"]);

    fireEvent.click(screen.getByRole("button", { name: "Retomar cena" }));
    expect(screen.getByTestId("field").getAttribute("data-frozen")).toBe("false");
    expect(screen.getByTestId("field").getAttribute("data-progression")).toBe("1.64");
    expect(screen.getByRole("button", { name: "Reencontro" }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("heading", { name: "Outra forma de existir." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Salvar imagem" }));
    expect(downloads).toEqual(["solaris-origem.png", "solaris-reencontro.png"]);
  });

  it("leaves a held frame when a chapter is explicitly chosen and respects reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    render(<ParticlePassage accent="#ffffff" intensity={0.6} audioLevel={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Congelar cena" }));
    fireEvent.click(screen.getByRole("button", { name: "Ruptura" }));

    expect(screen.getByTestId("field").getAttribute("data-frozen")).toBe("false");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 2000 * (1.4 / 3), behavior: "instant" });
    expect((screen.getByRole("button", { name: "Dispersar" }) as HTMLButtonElement).disabled).toBe(false);
  });
});
