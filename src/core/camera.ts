import { PerspectiveCamera, Vector2, Vector3 } from "three";
import { clamp } from "./math";
import { Spring } from "./spring";

export type CameraGoal = { distance: number; orbit: number; height: number; fov: number };
const FRAME_ASPECT = 0.8;

// Authored framing, mood framing and cursor parallax retain their velocities.
// New targets slow the camera into a turn instead of changing its direction instantly.
export class CameraRig {
  readonly camera: PerspectiveCamera;
  readonly goal: CameraGoal;
  private readonly channels: Record<keyof CameraGoal, Spring>;
  private readonly pointerGoal = new Vector2();
  private readonly pointer = [new Spring(0, 16), new Spring(0, 16)];
  private readonly target = new Vector3();
  private readonly focusGoal = new Vector3();
  private readonly focus = [new Spring(0, 16), new Spring(0, 16), new Spring(0, 16)];
  private readonly expressionGoal = new Vector2();
  private readonly expression = [new Spring(0, 9), new Spring(0, 9)];
  private readonly roll = new Spring(0, 9);
  private rollGoal = 0;
  private readonly minimumDistance: number;

  constructor(initial: CameraGoal, rate = 2.2, minimumDistance = 0.5) {
    this.goal = { ...initial };
    const stiffness = (rate * 2) ** 2;
    this.channels = {
      distance: new Spring(initial.distance, stiffness), orbit: new Spring(initial.orbit, stiffness),
      height: new Spring(initial.height, stiffness), fov: new Spring(initial.fov, stiffness),
    };
    this.minimumDistance = minimumDistance;
    this.camera = new PerspectiveCamera(initial.fov, 1, 0.1, 100);
  }
  setAspect(aspect: number) {
    this.camera.aspect = Math.max(0.01, aspect);
    this.camera.updateProjectionMatrix();
  }
  setPointer(x: number, y: number) { this.pointerGoal.set(clamp(x, -1, 1), clamp(y, -1, 1)); }
  setFocus(x: number, y: number, z: number) { this.focusGoal.set(x, y, z); }
  setExpression(distance: number, orbit: number, roll = 0) {
    this.expressionGoal.set(distance, orbit); this.rollGoal = roll;
  }
  snap() {
    for (const key of Object.keys(this.channels) as (keyof CameraGoal)[]) this.channels[key].snap(this.goal[key]);
    this.pointer.forEach(channel => channel.snap(0));
    this.pointerGoal.set(0, 0);
    this.expression.forEach(channel => channel.snap(0));
    this.expressionGoal.set(0, 0);
    this.focus.forEach((channel, i) => channel.snap(this.focusGoal.getComponent(i)));
    this.target.copy(this.focusGoal);
    this.roll.snap(0); this.rollGoal = 0;
  }
  update(dt: number, elapsed: number, motion: number) {
    const distance = this.channels.distance.step(Math.max(this.minimumDistance, this.goal.distance), dt);
    const authoredOrbit = this.channels.orbit.step(this.goal.orbit, dt);
    const authoredHeight = this.channels.height.step(this.goal.height, dt);
    const fov = this.channels.fov.step(this.goal.fov, dt);
    const px = this.pointer[0].step(this.pointerGoal.x, dt);
    const py = this.pointer[1].step(this.pointerGoal.y, dt);
    const expressionDistance = this.expression[0].step(this.expressionGoal.x, dt);
    const expressionOrbit = this.expression[1].step(this.expressionGoal.y, dt);
    const roll = this.roll.step(this.rollGoal, dt);
    this.target.set(...this.focus.map((channel, i) => channel.step(this.focusGoal.getComponent(i), dt)) as [number, number, number]);
    if (Math.abs(this.camera.fov - fov) > 1e-4) {
      this.camera.fov = fov; this.camera.updateProjectionMatrix();
    }
    const orbit = authoredOrbit + (expressionOrbit + Math.sin(elapsed * 0.065) * 0.012 + px * 0.02) * motion;
    const height = authoredHeight + (py * 0.018 + Math.sin(elapsed * 0.09) * 0.009) * motion;
    const d = Math.max(this.minimumDistance, distance + expressionDistance * motion) * Math.max(1, FRAME_ASPECT / this.camera.aspect);
    this.camera.position.set(Math.sin(orbit) * Math.cos(height) * d, Math.sin(height) * d, Math.cos(orbit) * Math.cos(height) * d);
    this.camera.lookAt(this.target);
    this.camera.rotateZ(roll * motion);
  }
}
