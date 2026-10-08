import { describe, expect, it } from "vitest";
import { clamp, createRandom, damp, lerp, smoothstep } from "./math";

describe("math helpers", () => {
  it("clamps and interpolates", () => {
    expect(clamp(2)).toBe(1);
    expect(clamp(-1)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(lerp(2, 6, 0.25)).toBe(3);
  });

  it("eases smoothstep between edges", () => {
    expect(smoothstep(0, 1, -1)).toBe(0);
    expect(smoothstep(0, 1, 2)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5);
  });

  it("approaches its target the same way regardless of frame rate", () => {
    const oneStep = damp(0, 10, 3, 1 / 30);
    const twoSteps = damp(damp(0, 10, 3, 1 / 60), 10, 3, 1 / 60);
    expect(twoSteps).toBeCloseTo(oneStep, 10);
  });

  it("produces the same deterministic sequence for the same seed, within [0, 1)", () => {
    const a = createRandom(42);
    const b = createRandom(42);
    const values = Array.from({ length: 500 }, () => a());
    expect(values).toEqual(Array.from({ length: 500 }, () => b()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });
});
