import { describe, expect, it, vi } from "vitest";
import { CAMERA_BASE, CAMERA_INTRO, HOLD_SECONDS } from "./config";
import { createPerformance } from "./performance";

function advance(performance: ReturnType<typeof createPerformance>, seconds: number) {
  for (let t = 0; t < seconds; t += 0.05) performance.step(0.05);
}
describe("AWAKENING performance clock", () => {
  it("holds the opening until visible-frame time advances, then awakens once", () => {
    const onPhase = vi.fn();
    const p = createPerformance({ ...CAMERA_INTRO }, false, { onPhase });
    expect(p.phase).toBe("intro");
    expect(p.director.core).toBe(0);
    advance(p, 4);
    const reveal = p.director.reveal;
    p.step(0);
    expect(p.director.reveal).toBe(reveal);
    advance(p, 8);
    expect(p.phase).toBe("awake");
    expect(onPhase).toHaveBeenCalledTimes(1);
    p.dispose();
  });
  it("a sustained hold triggers one sequence and leaves a changed entity", () => {
    const onSequence = vi.fn();
    const p = createPerformance({ ...CAMERA_INTRO }, false, { onSequence });
    advance(p, 12);
    p.hold(true);
    advance(p, HOLD_SECONDS + 0.1);
    expect(p.phase).toBe("sequence");
    expect(p.metamorphose()).toBe(false);
    expect(onSequence).toHaveBeenCalledWith(true);
    advance(p, 13);
    expect(p.phase).toBe("awake");
    expect(p.director.evolution).toBeCloseTo(1);
    expect(onSequence.mock.calls).toEqual([[true], [false]]);
    p.dispose();
  });
  it("releasing a short hold cancels the charge without triggering", () => {
    const p = createPerformance({ ...CAMERA_BASE }, true);
    p.hold(true); advance(p, 0.4); p.hold(false); advance(p, 1);
    expect(p.charge).toBe(0);
    expect(p.phase).toBe("awake");
    p.dispose();
  });
  it("changing motion preference during the dive stops all spatial choreography", () => {
    const goal = { ...CAMERA_INTRO };
    const onSequence = vi.fn();
    const p = createPerformance(goal, false, { onSequence });
    advance(p, 12); p.metamorphose(); advance(p, 6);
    expect(p.director.dive).toBeGreaterThan(0.5);
    p.setReduced(true);
    expect(p.phase).toBe("awake");
    expect(p.director.morph).toBe(0);
    expect(p.director.disperse).toBe(0);
    expect(p.director.dive).toBe(0);
    expect(goal).toMatchObject(CAMERA_BASE);
    expect(onSequence.mock.calls).toEqual([[true], [false]]);
    p.setReduced(false); advance(p, 2);
    expect(p.phase).toBe("awake");
    p.dispose();
  });
  it("keeps the essential sequence accessible with reduced motion, without a camera dive", () => {
    const goal = { ...CAMERA_BASE };
    const p = createPerformance(goal, true);
    expect(p.metamorphose()).toBe(true);
    advance(p, 0.6);
    expect(p.director.flash).toBeGreaterThan(0);
    expect(p.director.morph).toBe(0);
    expect(goal).toMatchObject(CAMERA_BASE);
    advance(p, 2);
    expect(p.phase).toBe("awake");
    p.dispose();
  });
});
