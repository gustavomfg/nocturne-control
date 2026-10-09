import { clamp, damp } from "../../core/math";
import type { Mood } from "./behavior";

type Sample = { time: number; x: number; y: number };
export type Gaze = { x: number; y: number; blink: number };

// A short visual memory, bounded anticipation and independent micro-saccades.
// Nothing random runs per frame: the same input produces the same performance.
export class Perception {
  private readonly samples: Sample[] = [];
  private time = 0;
  private x = 0;
  private y = 0;
  private lastX = 0;
  private lastY = 0;
  private vx = 0;
  private vy = 0;
  private present = false;
  private mood: Mood = "observing";
  private hesitation = 0;

  step(x: number, y: number, present: boolean, mood: Mood, dt: number): Gaze {
    this.time += dt;
    if (present && !this.present) {
      this.lastX = x; this.lastY = y;
      this.samples.length = 0;
      this.vx = 0; this.vy = 0;
    }
    this.present = present;
    if (mood !== this.mood) {
      this.hesitation = mood === "curious" ? 0.3 : 0.16;
      this.mood = mood;
    }
    this.hesitation = Math.max(0, this.hesitation - dt);
    this.vx = damp(this.vx, dt > 0 ? (x - this.lastX) / dt : 0, 6, dt);
    this.vy = damp(this.vy, dt > 0 ? (y - this.lastY) / dt : 0, 6, dt);
    this.lastX = x; this.lastY = y;
    this.samples.push({ time: this.time, x, y });
    const delay = mood === "curious" ? 0.22 : 0.34;
    while (this.samples.length > 2 && this.samples[1].time <= this.time - delay) this.samples.shift();
    const memory = this.samples[0];
    const attentive = present && mood !== "ignoring" && mood !== "dreaming";
    const prediction = mood === "alert" ? 0.07 : 0.035;
    const breathing = Math.sin(this.time * 0.71) * Math.sin(this.time * 0.19);
    const targetX = attentive ? memory.x + clamp(this.vx * prediction, -0.08, 0.08) : Math.sin(this.time * 0.21) * 0.3;
    const targetY = attentive ? memory.y + clamp(this.vy * prediction, -0.05, 0.05) : Math.sin(this.time * 0.13) * 0.12;
    if (this.hesitation === 0) {
      this.x = damp(this.x, targetX + breathing * 0.016, mood === "alert" ? 4 : 2.4, dt);
      this.y = damp(this.y, targetY, 2, dt);
    }
    // Rare, soft eyelid closures. Mood changes keep their own aperture.
    const beat = this.time % 8.7;
    const blink = beat > 7.85 && beat < 8.15 ? Math.sin(((beat - 7.85) / 0.3) * Math.PI) ** 2 : 0;
    return { x: clamp(this.x, -1, 1), y: clamp(this.y, -1, 1), blink };
  }
}
