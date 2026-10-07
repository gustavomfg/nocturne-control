// Frame-rate independent motion for the sculpture. Everything here is plain
// arithmetic so it can be tested without a GPU.

export const INTRO_SECONDS = 3.2;
const IDLE_TURN = 0.11;
const POINTER_TURN = 0.3;
const POINTER_TILT = 0.16;

export type MotionInput = {
  dt: number;
  paused: boolean;
  dissolve: number;
  turn: number;
  tilt: number;
  pointer: { x: number; y: number; active: boolean };
  energy: number;
};

export type SculptureFrame = {
  yaw: number;
  pitch: number;
  dissolve: number;
  burst: number;
  time: number;
  wake: number;
  energy: number;
  pointer: { x: number; y: number };
};

export function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export class SculptureMotion {
  private dissolveCurrent = 0;
  private turnCurrent = 0;
  private tiltCurrent = 0;
  private spinOffset = 0;
  private spinVelocity = 0;
  private introAge: number | null;
  private burstAge = Number.POSITIVE_INFINITY;
  private time = 0;
  private wake = 0;
  private pointer = { x: 0, y: 0 };
  private materialize = 0;
  private energy = 0;
  private moving = false;

  constructor({ intro = false }: { intro?: boolean } = {}) {
    // An intro starts as dust and gathers into the sculpture on first show.
    this.introAge = intro ? 0 : null;
    this.materialize = intro ? 1 : 0;
  }

  step(input: MotionInput): SculptureFrame {
    const { dt } = input;
    this.dissolveCurrent = approach(this.dissolveCurrent, input.dissolve, 3.4, dt);
    this.turnCurrent = approach(this.turnCurrent, input.turn, 2.4, dt);
    this.tiltCurrent = approach(this.tiltCurrent, input.tilt, 2.4, dt);
    this.energy = approach(this.energy, input.energy, 8, dt);

    if (this.introAge !== null) {
      this.introAge += dt;
      const progress = Math.min(1, this.introAge / INTRO_SECONDS);
      this.materialize = 1 - easeOutCubic(progress);
      if (progress >= 1) this.introAge = null;
    }

    if (this.burstAge !== Number.POSITIVE_INFINITY) this.burstAge += dt;
    const burst = this.burstAge === Number.POSITIVE_INFINITY ? 0 : burstEnvelope(this.burstAge);
    if (this.burstAge > 3) this.burstAge = Number.POSITIVE_INFINITY;

    this.moving = Math.abs(this.dissolveCurrent - input.dissolve) > 0.0005
      || Math.abs(this.turnCurrent - input.turn) > 0.0005
      || Math.abs(this.tiltCurrent - input.tilt) > 0.0005
      || this.introAge !== null
      || this.burstAge !== Number.POSITIVE_INFINITY
      || this.wake > 0.002
      || Math.abs(this.spinVelocity) > 0.002;

    this.spinOffset += this.spinVelocity * dt;
    this.spinVelocity *= Math.exp(-dt * 2.6);
    this.wake *= Math.exp(-dt * 1.4);

    if (!input.paused) {
      this.time += dt;
      const target = input.pointer.active ? input.pointer : { x: 0, y: 0 };
      this.pointer.x = approach(this.pointer.x, target.x, 5, dt);
      this.pointer.y = approach(this.pointer.y, target.y, 5, dt);
    }

    return {
      yaw: this.turnCurrent + this.spinOffset + IDLE_TURN * this.time + POINTER_TURN * this.pointer.x,
      pitch: this.tiltCurrent - POINTER_TILT * this.pointer.y,
      dissolve: Math.max(this.dissolveCurrent, this.materialize),
      burst,
      time: this.time,
      wake: this.wake,
      energy: this.energy,
      pointer: { x: this.pointer.x, y: this.pointer.y },
    };
  }

  // A pulse disperses the sculpture briefly, then the matter returns.
  disperse() {
    this.burstAge = 0;
  }

  // Movement across the sculpture leaves a wake that heals behind the gesture.
  touch(strength: number) {
    this.wake = Math.min(1, this.wake + strength);
  }

  // Drag adds spin with inertia; the velocity decays after the pointer lets go.
  spin(amount: number) {
    this.spinVelocity += amount;
  }

  // True while springs, the intro, a dispersal, the wake or a spin still change the frame.
  isMoving(): boolean {
    return this.moving;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// A quick rise then a long fall, peaking near 1 after roughly a quarter second.
function burstEnvelope(age: number): number {
  return Math.min(1, age * 4) * Math.exp(-age * 2.6) * 1.9;
}
