import { describe, expect, it } from "vitest";
import { Spring } from "./spring";

describe("Spring", () => {
  it("settles on its target", () => {
    const spring = new Spring(0, 30);
    for (let i = 0; i < 240; i++) spring.step(1, 1 / 60);
    expect(spring.value).toBeCloseTo(1, 3);
  });

  it("is critically damped by default, without overshooting", () => {
    const spring = new Spring(0, 14);
    let previous=0;
    for (let i=0;i<180;i++) {
      const value=spring.step(1,1/60);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(1);
      previous=value;
    }
  });

  it("retains velocity when a target reverses and behaves consistently at different frame rates", () => {
    const spring=new Spring(0,14);
    spring.step(1,0.2);
    const velocity=spring.velocity;
    spring.step(-1,0);
    expect(spring.velocity).toBeCloseTo(velocity,8);
    const a=new Spring(0,14), b=new Spring(0,14);
    for(let i=0;i<60;i++) a.step(1,1/30);
    for(let i=0;i<240;i++) b.step(1,1/120);
    expect(a.value).toBeCloseTo(b.value,8);
    expect(a.velocity).toBeCloseTo(b.velocity,8);
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
