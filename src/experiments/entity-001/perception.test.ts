import { describe, expect, it } from "vitest";
import { Perception } from "./perception";

describe("Perception", () => {
  it("uses visual memory before turning toward a new cursor position", () => {
    const p = new Perception();
    for (let i = 0; i < 60; i++) p.step(0, 0, true, "observing", 1 / 60);
    const first = p.step(1, 0.4, true, "observing", 1 / 60);
    expect(first.x).toBeLessThan(0.1);
    let gaze = first;
    for (let i = 0; i < 180; i++) gaze = p.step(1, 0.4, true, "observing", 1 / 60);
    expect(gaze.x).toBeGreaterThan(0.9);
    expect(gaze.y).toBeGreaterThan(0.35);
  });
  it("ignores pursuit for an interval and bounds anticipation on re-entry", () => {
    const p = new Perception();
    let gaze = p.step(1, 1, true, "ignoring", 0.05);
    for (let i = 0; i < 100; i++) gaze = p.step(1, 1, true, "ignoring", 0.05);
    expect(gaze.x).toBeLessThan(0.4);
    expect(gaze.y).toBeLessThan(0.2);
    p.step(-1, -1, false, "observing", 0.05);
    gaze = p.step(1, 1, true, "observing", 0.001);
    expect(Number.isFinite(gaze.x)).toBe(true);
    expect(Math.abs(gaze.x)).toBeLessThanOrEqual(1);
  });
});
