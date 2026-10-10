import { clamp, damp, lerp, smoothstep } from "../../core/math";
import { Spring } from "../../core/spring";
import type { Mood } from "./behavior";

type Sample = { time: number; x: number; y: number };
export type Gaze = { x: number; y: number; blink: number };

export class Perception {
  private readonly samples: Sample[] = [];
  private readonly x = new Spring(0, 36);
  private readonly y = new Spring(0, 30);
  private time = 0;
  private lastX = 0;
  private lastY = 0;
  private vx = 0;
  private vy = 0;
  private present = false;
  private mood: Mood = "observing";
  private hesitation = 0;
  private attention = 0;

  step(x: number, y: number, present: boolean, mood: Mood, dt: number): Gaze {
    x = clamp(x, -1, 1); y = clamp(y, -1, 1);
    this.time += dt;
    if (present && !this.present) {
      this.lastX = x; this.lastY = y; this.samples.length = 0; this.vx = 0; this.vy = 0;
    }
    this.present = present;
    if (mood !== this.mood) { this.hesitation = 0.3; this.mood = mood; }
    this.hesitation = Math.max(0, this.hesitation - dt);
    this.vx = damp(this.vx, dt > 0 ? clamp((x - this.lastX) / dt, -5, 5) : 0, 4, dt);
    this.vy = damp(this.vy, dt > 0 ? clamp((y - this.lastY) / dt, -5, 5) : 0, 4, dt);
    this.lastX = x; this.lastY = y;
    this.samples.push({ time: this.time, x, y });
    const memoryTime = this.time - (mood === "curious" ? 0.24 : 0.32);
    while (this.samples.length > 2 && this.samples[1].time <= memoryTime) this.samples.shift();
    const before = this.samples[0], after = this.samples[1] ?? before;
    const blend = after.time > before.time ? clamp((memoryTime - before.time) / (after.time - before.time)) : 0;
    const attentive = present && mood !== "ignoring" && mood !== "dreaming";
    this.attention = damp(this.attention, attentive ? 1 - this.hesitation * 1.2 : 0, 3, dt);
    const predictedX = lerp(before.x, after.x, blend) + clamp(this.vx * 0.018, -0.025, 0.025);
    const predictedY = lerp(before.y, after.y, blend) + clamp(this.vy * 0.014, -0.02, 0.02);
    const quietX = Math.sin(this.time * 0.16) * 0.07;
    const quietY = Math.sin(this.time * 0.11) * 0.03;
    const targetX = lerp(quietX, predictedX, this.attention);
    const targetY = lerp(quietY, predictedY, this.attention);
    const beat = this.time % 9.6;
    const closing = smoothstep(8.7, 8.9, beat);
    const opening = 1 - smoothstep(8.9, 9.24, beat);
    return { x: clamp(this.x.step(targetX, dt), -1, 1), y: clamp(this.y.step(targetY, dt), -1, 1), blink: closing * opening };
  }
}
