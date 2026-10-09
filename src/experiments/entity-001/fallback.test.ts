// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFallbackScene } from "./EntityFallback";

afterEach(() => vi.unstubAllGlobals());
describe("essential AWAKENING renderer", () => {
  it("supports a reduced-motion metamorphosis and releases its loop without WebGL", () => {
    const frames = new Map<number, FrameRequestCallback>();
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => { frames.set(++id, fn); return id; });
    vi.stubGlobal("cancelAnimationFrame", (frame: number) => frames.delete(frame));
    const gradient = { addColorStop: vi.fn() };
    const context = new Proxy({}, { get: (_, key) => key === "createRadialGradient" ? () => gradient : () => undefined });
    const canvas = document.createElement("canvas");
    vi.spyOn(canvas, "getContext").mockReturnValue(context as CanvasRenderingContext2D);
    const onSequence = vi.fn();
    const onState = vi.fn();
    const scene = createFallbackScene({ canvas, compact: true, reduced: true,
      onSequence, onState, onContextLost: vi.fn() });
    scene.setSize(390, 844);
    expect(scene.metamorphose()).toBe(true);
    for (let time = 1000; time < 4000; time += 50) {
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time));
    }
    expect(canvas.dataset.ready).toBe("true");
    expect(canvas.dataset.phase).toBe("awake");
    expect(onSequence.mock.calls).toEqual([[true], [false]]);
    expect(onState).toHaveBeenCalled();
    scene.dispose();
    expect(frames.size).toBe(0);
  });
});
