import { PerspectiveCamera, Vector2, Vector3 } from "three";
import { clamp, damp } from "./math";

export type CameraGoal = {
  distance: number;
  // Horizontal orbit around the subject, in radians.
  orbit: number;
  // Vertical angle above the subject's plane, in radians.
  height: number;
  fov: number;
};

// An orbiting camera with damped motion. Its goal is plain data, so a GSAP
// timeline can tween it directly while the rig keeps the motion smooth.
// Below this aspect ratio the horizontal field is the constraint: the camera backs
// off so the subject keeps its width on narrow, portrait screens.
const FRAME_ASPECT = 0.8;

export class CameraRig {
  readonly camera: PerspectiveCamera;
  readonly goal: CameraGoal;
  private readonly current: CameraGoal;
  private readonly pointer = new Vector2();
  private readonly pointerGoal = new Vector2();
  private readonly target = new Vector3();
  private readonly focusGoal = new Vector3();
  private readonly expression = new Vector3();
  private readonly expressionGoal = new Vector3();
  private roll = 0;
  private rollGoal = 0;
  private readonly rate: number;

  constructor(initial: CameraGoal, rate = 2.2) {
    this.goal = { ...initial };
    this.current = { ...initial };
    this.rate = rate;
    this.camera = new PerspectiveCamera(initial.fov, 1, 0.1, 100);
  }

  setAspect(aspect: number) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  // Pointer position in normalized device coordinates (-1 to 1).
  setPointer(x: number, y: number) {
    this.pointerGoal.set(clamp(x, -1, 1), clamp(y, -1, 1));
  }

  setFocus(x: number, y: number, z: number) {
    this.focusGoal.set(x, y, z);
  }

  snap() {
    Object.assign(this.current, this.goal);
    this.expression.set(0, 0, 0);
    this.expressionGoal.set(0, 0, 0);
    this.pointer.set(0, 0);
    this.pointerGoal.set(0, 0);
    this.target.copy(this.focusGoal);
    this.roll = 0;
    this.rollGoal = 0;
  }

  // Mood framing is independent of authored camera goals, so it cannot overwrite
  // a cinematic timeline. Distance, orbit and roll ease together.
  setExpression(distance: number, orbit: number, roll = 0) {
    this.expressionGoal.set(distance, orbit, 0);
    this.rollGoal = roll;
  }

  update(dt: number, elapsed: number, motion: number) {
    this.current.distance = damp(this.current.distance, this.goal.distance, this.rate, dt);
    this.current.orbit = damp(this.current.orbit, this.goal.orbit, this.rate, dt);
    this.current.height = damp(this.current.height, this.goal.height, this.rate, dt);
    this.current.fov = damp(this.current.fov, this.goal.fov, this.rate, dt);
    this.pointer.lerp(this.pointerGoal, 1 - Math.exp(-dt * 2));
    this.target.lerp(this.focusGoal, 1 - Math.exp(-dt * 2.4));
    this.expression.lerp(this.expressionGoal, 1 - Math.exp(-dt * 1.25));
    this.roll = damp(this.roll, this.rollGoal, 1.5, dt);

    if (Math.abs(this.camera.fov - this.current.fov) > 1e-4) {
      this.camera.fov = this.current.fov;
      this.camera.updateProjectionMatrix();
    }

    // The idle drift and pointer parallax are scaled by `motion`, which is zero under reduced motion.
    const orbit = this.current.orbit + (this.expression.y + Math.sin(elapsed * 0.07) * 0.025 + this.pointer.x * 0.045) * motion;
    const height = this.current.height + (this.pointer.y * 0.08 + Math.sin(elapsed * 0.11) * 0.03) * motion;
    const d = Math.max(0.5, this.current.distance + this.expression.x * motion) * Math.max(1, FRAME_ASPECT / this.camera.aspect);
    this.camera.position.set(
      Math.sin(orbit) * Math.cos(height) * d,
      Math.sin(height) * d,
      Math.cos(orbit) * Math.cos(height) * d,
    );
    this.camera.lookAt(this.target);
    this.camera.rotateZ(this.roll * motion);
  }
}
