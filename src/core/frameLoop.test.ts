// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFrameLoop } from "./frameLoop";

let frames: Map<number, FrameRequestCallback>;
let nextId: number;

beforeEach(() => {
  frames = new Map();
  nextId = 1;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextId++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Runs every scheduled frame once, as the browser would.
function runFrame(time: number) {
  const pending = [...frames.entries()];
  frames.clear();
  for (const [, callback] of pending) callback(time);
}

describe("createFrameLoop", () => {
  it("ticks with a clamped delta and stops scheduling while off screen", () => {
    const ticks: number[] = [];
    const loop = createFrameLoop((dt) => ticks.push(dt));
    loop.start();
    runFrame(1000);
    runFrame(1016);
    expect(ticks[0]).toBe(0);
    expect(ticks[1]).toBeCloseTo(0.016, 3);

    loop.setVisible(false);
    expect(frames.size).toBe(0);
    loop.setVisible(true);
    expect(frames.size).toBe(1);
    loop.dispose();
  });

  it("does not run while the document is hidden", () => {
    const ticks: number[] = [];
    const loop = createFrameLoop((dt) => ticks.push(dt));
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    loop.start();
    expect(frames.size).toBe(0);
    loop.dispose();
  });

  it("releases its frame and listeners on dispose", () => {
    const loop = createFrameLoop(() => undefined);
    loop.start();
    loop.dispose();
    expect(frames.size).toBe(0);
  });
});
