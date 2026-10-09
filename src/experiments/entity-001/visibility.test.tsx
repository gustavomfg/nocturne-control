// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const scene = vi.hoisted(() => ({
  setSize: vi.fn(), setVisible: vi.fn(), setReduced: vi.fn(), pointer: vi.fn(),
  leave: vi.fn(), hold: vi.fn(), tap: vi.fn(), metamorphose: vi.fn(), dispose: vi.fn(),
}));
vi.mock("./scene", () => ({ createEntityScene: () => scene }));
vi.mock("../../core/capabilities", () => ({
  supportsWebGL2: () => true,
  watchReducedMotion: (callback: (value: boolean) => void) => { callback(false); return () => undefined; },
}));
import Entity001 from "./Entity001";

let width = 390;
let resize: () => void;
let intersection: (entries: { isIntersecting: boolean; intersectionRatio: number }[]) => void;
beforeEach(() => {
  vi.clearAllMocks();
  width = 390;
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(844);
  vi.stubGlobal("ResizeObserver", class {
    constructor(callback: () => void) { resize = callback; }
    observe() {} disconnect() {}
  });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: typeof intersection) { intersection = callback; }
    observe() {} disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("experiment visibility ownership", () => {
  it("pauses zero-area and non-intersecting stages, then resumes without resizing to 1px", () => {
    render(<Entity001 />);
    expect(scene.setVisible).toHaveBeenLastCalledWith(true);
    intersection([{ isIntersecting: false, intersectionRatio: 0 }]);
    expect(scene.setVisible).toHaveBeenLastCalledWith(false);
    intersection([{ isIntersecting: true, intersectionRatio: 1 }]);
    expect(scene.setVisible).toHaveBeenLastCalledWith(true);
    scene.setSize.mockClear();
    width = 0; resize();
    expect(scene.setVisible).toHaveBeenLastCalledWith(false);
    expect(scene.setSize).not.toHaveBeenCalled();
    width = 390; resize();
    expect(scene.setVisible).toHaveBeenLastCalledWith(true);
    expect(scene.setSize).toHaveBeenLastCalledWith(390, 844);
    cleanup();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });
});
