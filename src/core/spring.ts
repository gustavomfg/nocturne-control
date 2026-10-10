// A damped spring with sub-steps. Lower stiffness gives a slower, heavier response;
// lower damping lets the value overshoot a little, which reads as organic inertia.
export class Spring {
  value: number;
  velocity = 0;
  private readonly stiffness: number;
  private readonly damping: number;

  constructor(value = 0, stiffness = 30, damping = 2 * Math.sqrt(stiffness)) {
    this.value = value;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  step(target: number, dt: number) {
    // The exact critically damped solution preserves velocity across a new
    // target and remains consistent when the frame duration changes.
    const omega = Math.sqrt(this.stiffness);
    if (Math.abs(this.damping - 2 * omega) < 1e-8) {
      const offset = this.value - target;
      const carry = this.velocity + omega * offset;
      const decay = Math.exp(-omega * dt);
      this.value = target + (offset + carry * dt) * decay;
      this.velocity = (this.velocity - omega * carry * dt) * decay;
      return this.value;
    }
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const acceleration = this.stiffness * (target - this.value) - this.damping * this.velocity;
      this.velocity += acceleration * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }

  snap(value: number) { this.value = value; this.velocity = 0; }
}
