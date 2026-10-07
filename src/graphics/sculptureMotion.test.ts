import { describe, expect, it } from "vitest";
import { INTRO_SECONDS, SculptureMotion, approach, type MotionInput } from "./sculptureMotion";

const still: MotionInput = { dt: 0.1, paused: false, dissolve: 0, turn: 0, tilt: 0, pointer: { x: 0, y: 0, active: false }, energy: 0 };

function run(motion: SculptureMotion, input: Partial<MotionInput>, seconds: number) {
  let frame = motion.step({ ...still, ...input, dt: 0 });
  for (let t = 0; t < seconds; t += 0.05) frame = motion.step({ ...still, ...input, dt: 0.05 });
  return frame;
}

describe("SculptureMotion", () => {
  it("approaches its dissolve target without overshooting", () => {
    const motion = new SculptureMotion();
    expect(approach(0, 1, 3.4, 0.1)).toBeGreaterThan(0);
    const frame = run(motion, { dissolve: 1 }, 3);
    expect(frame.dissolve).toBeGreaterThan(0.99);
    expect(frame.dissolve).toBeLessThanOrEqual(1);
  });

  it("starts as dust when it has an intro and gathers into the sculpture", () => {
    const motion = new SculptureMotion({ intro: true });
    expect(motion.step({ ...still, dt: 0 }).dissolve).toBeCloseTo(1);
    const frame = run(motion, {}, INTRO_SECONDS + 0.5);
    expect(frame.dissolve).toBeCloseTo(0, 3);
    expect(motion.isMoving()).toBe(false);
  });

  it("peaks in a brief dispersal and then returns the matter", () => {
    const motion = new SculptureMotion();
    motion.disperse();
    const early = run(motion, {}, 0.25);
    expect(early.burst).toBeGreaterThan(0.5);
    const late = run(motion, {}, 2);
    expect(late.burst).toBeLessThan(0.05);
    expect(run(motion, {}, 2).burst).toBe(0);
  });

  it("freezes time, pointer and idle turn while paused", () => {
    const motion = new SculptureMotion();
    const before = run(motion, {}, 0.5);
    const paused = run(motion, { paused: true, pointer: { x: 1, y: 0, active: true } }, 2);
    expect(paused.time).toBeCloseTo(before.time);
    expect(paused.pointer.x).toBeCloseTo(before.pointer.x);
  });

  it("lets a wake and a spin fade away instead of accumulating forever", () => {
    const motion = new SculptureMotion();
    motion.touch(0.8);
    motion.spin(2);
    const frame = run(motion, {}, 6);
    expect(frame.wake).toBeLessThan(0.01);
    expect(motion.isMoving()).toBe(false);
  });

  it("follows the scroll turn and eases the energy from sound", () => {
    const motion = new SculptureMotion();
    const frame = run(motion, { turn: 1, tilt: 0.2, energy: 0.6 }, 3);
    expect(frame.yaw).toBeGreaterThan(0.95);
    expect(frame.pitch).toBeCloseTo(0.2, 1);
    expect(frame.energy).toBeCloseTo(0.6, 2);
  });
});
