import { describe, expect, it, vi } from "vitest";
import { createDirector, playIntro, playMetamorphosis } from "./choreography";
import { CAMERA_BASE, CAMERA_INTRO, MIN_CAMERA_DISTANCE } from "./config";

describe("cinematic opening", () => {
  it("settles at rest and approaches along one continuous direction", () => {
    const director = createDirector(), goal = { ...CAMERA_INTRO }, onDone = vi.fn();
    const timeline = playIntro(director, goal, onDone);
    expect(timeline.paused()).toBe(true);
    let distance = goal.distance, orbit = goal.orbit;
    for (let t=0; t<timeline.duration(); t+=0.05) {
      timeline.time(t);
      expect(goal.distance).toBeLessThanOrEqual(distance+0.00001);
      expect(goal.orbit).toBeGreaterThanOrEqual(orbit-0.00001);
      distance=goal.distance; orbit=goal.orbit;
    }
    timeline.progress(1);
    expect(goal).toMatchObject(CAMERA_BASE);
    expect(director.reveal).toBeCloseTo(1); expect(onDone).toHaveBeenCalled();
    timeline.kill();
  });
});
describe("controlled resonance", () => {
  it("preserves the silhouette and camera clearance across every beat", () => {
    const director = createDirector(), goal = {...CAMERA_BASE};
    const timeline = playMetamorphosis(director, goal, false, () => undefined);
    let previous = goal.distance;
    for (let t=0; t<timeline.duration(); t+=1/60) {
      timeline.time(t);
      expect(goal.distance).toBeGreaterThanOrEqual(MIN_CAMERA_DISTANCE);
      expect(goal.fov).toBe(CAMERA_BASE.fov);
      expect(Math.abs(goal.distance-previous)).toBeLessThan(0.02);
      expect(director.opening).toBeGreaterThanOrEqual(-0.025);
      expect(director.opening).toBeLessThanOrEqual(0.16);
      expect(director.core).toBeLessThanOrEqual(1.1);
      previous=goal.distance;
    }
    timeline.progress(1);
    expect(goal).toMatchObject(CAMERA_BASE);
    expect(director.opening).toBeCloseTo(0); expect(director.resonance).toBeCloseTo(0);
    timeline.kill();
  });
  it("uses only a restrained light pulse under reduced motion", () => {
    const director=createDirector(), goal={...CAMERA_BASE};
    const timeline=playMetamorphosis(director,goal,true,()=>undefined);
    timeline.progress(0.3);
    expect(director.flash).toBeGreaterThan(0);
    expect(director.flash).toBeLessThanOrEqual(0.12);
    expect(director.opening).toBe(0);
    expect(goal).toMatchObject(CAMERA_BASE);
    timeline.kill();
  });
});
