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

  it("keeps clearance even when framing requests an excessive close-up", () => {
    const rig=new CameraRig({...goal,distance:13.2},2.2,12.5);
    rig.goal.distance=2.1; rig.setExpression(-1,0);
    for(let i=0;i<300;i++) {
      rig.update(1/60,i/60,1);
      expect(rig.camera.position.length()).toBeGreaterThanOrEqual(12.5-1e-8);
    }
  });

  it("freezes all parallax after a reduced-motion snap", () => {
    const rig=new CameraRig(goal);
    rig.setPointer(1,-1); rig.setExpression(1,0.2,0.05);
    rig.update(0.2,1,1); rig.snap(); rig.update(0,0,0);
    const position=rig.camera.position.clone(), rotation=rig.camera.quaternion.clone();
    for(let i=0;i<60;i++) rig.update(1/60,i/60,0);
    expect(rig.camera.position.distanceTo(position)).toBeLessThan(1e-8);
    expect(rig.camera.quaternion.angleTo(rotation)).toBeLessThan(1e-8);
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
