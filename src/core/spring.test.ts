import { describe, expect, it } from "vitest";
import { Spring } from "./spring";

describe("Spring", () => {
  it("settles on its target", () => {
    const spring = new Spring(0, 30);
    for (let i = 0; i < 240; i++) spring.step(1, 1 / 60);
    expect(spring.value).toBeCloseTo(1, 3);
  });

  it("overshoots when lightly damped, which reads as inertia", () => {
    const spring = new Spring(0, 30, 2);
    let peak = 0;
    for (let i = 0; i < 120; i++) peak = Math.max(peak, spring.step(1, 1 / 60));
    expect(peak).toBeGreaterThan(1);
  });

  it("stays finite with large time steps", () => {
    const spring = new Spring(0, 400);
    spring.step(1, 2);
    expect(Number.isFinite(spring.value)).toBe(true);
    expect(Math.abs(spring.value)).toBeLessThan(10);
  });
});
