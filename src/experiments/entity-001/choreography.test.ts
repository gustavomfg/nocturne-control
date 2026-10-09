import { describe, expect, it, vi } from "vitest";
import { createDirector, playIntro, playMetamorphosis } from "./choreography";
import { CAMERA_BASE, CAMERA_INTRO } from "./config";

describe("intro choreography", () => {
  it("ends with the core lit, the shell materialized and the camera at rest", () => {
    const director = createDirector();
    const goal = { ...CAMERA_INTRO };
    const onDone = vi.fn();
    const timeline = playIntro(director, goal, onDone);
    expect(timeline.duration()).toBeGreaterThanOrEqual(8);
    expect(timeline.duration()).toBeLessThanOrEqual(15);
    expect(timeline.paused()).toBe(true);
    timeline.progress(1);

    expect(director.core).toBeCloseTo(1);
    expect(director.reveal).toBeCloseTo(1);
    expect(goal.distance).toBeCloseTo(CAMERA_BASE.distance);
    expect(onDone).toHaveBeenCalled();
    timeline.kill();
  });
});

describe("metamorphosis choreography", () => {
  it("gathers the shell into rings mid-sequence and returns it to rest at the end", () => {
    const director = createDirector();
    const goal = { ...CAMERA_BASE };
    const timeline = playMetamorphosis(director, goal, false, () => undefined);

    timeline.progress(0.5);
    expect(director.morph).toBeGreaterThan(0.5);
    expect(director.flash).toBeGreaterThanOrEqual(0);

    timeline.progress(1);
    expect(director.morph).toBeCloseTo(0);
    expect(director.disperse).toBeCloseTo(0);
    expect(director.flash).toBeCloseTo(0);
    expect(director.evolution).toBeCloseTo(1);
    timeline.kill();
  });

  it("under reduced motion only the light moves: no morph, no dispersal", () => {
    const director = createDirector();
    const goal = { ...CAMERA_BASE };
    const timeline = playMetamorphosis(director, goal, true, () => undefined);
    timeline.progress(0.3);
    expect(director.flash).toBeGreaterThan(0);
    expect(director.morph).toBe(0);
    expect(director.disperse).toBe(0);
    expect(goal.distance).toBeCloseTo(CAMERA_BASE.distance);
    timeline.kill();
  });
});
