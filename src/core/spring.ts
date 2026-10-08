// A damped spring with sub-steps. Lower stiffness gives a slower, heavier response;
// lower damping lets the value overshoot a little, which reads as organic inertia.
export class Spring {
  value: number;
  velocity = 0;
  private readonly stiffness: number;
  private readonly damping: number;

  constructor(value = 0, stiffness = 30, damping = 2 * Math.sqrt(stiffness) * 0.75) {
    this.value = value;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(target: number, dt: number) {
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acceleration = this.stiffness * (target - this.value) - this.damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}
