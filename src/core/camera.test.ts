import { describe, expect, it } from "vitest";
import { CameraRig } from "./camera";

const goal = { distance: 10, orbit: 0, height: 0, fov: 30 };

describe("CameraRig", () => {
  it("eases the distance toward its goal", () => {
    const rig = new CameraRig(goal);
    rig.goal.distance = 20;
    for (let i = 0; i < 300; i++) rig.update(1 / 60, i / 60, 1);
    expect(rig.camera.position.length()).toBeCloseTo(20, 1);
  });

  it("backs off on narrow screens so the subject keeps its width", () => {
    const wide = new CameraRig(goal);
    wide.setAspect(1.6);
    wide.update(1, 0, 0);
    const portrait = new CameraRig(goal);
    portrait.setAspect(0.45);
    portrait.update(1, 0, 0);
    expect(portrait.camera.position.length()).toBeGreaterThan(wide.camera.position.length());
  });
});
