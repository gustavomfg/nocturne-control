import type { CameraGoal } from "../../core/camera";
import { clamp } from "../../core/math";
import { createDirector, playIntro, playMetamorphosis, settleDirector } from "./choreography";
import { CAMERA_BASE, HOLD_SECONDS } from "./config";

export type Phase = "intro" | "awake" | "sequence";
export type PerformanceCallbacks = { onPhase?(phase: Phase): void; onSequence?(active: boolean): void; onCue?(): void };
export function createPerformance(goal: CameraGoal, initiallyReduced: boolean, callbacks: PerformanceCallbacks = {}) {
  const director = createDirector();
  let reduced = initiallyReduced;
  let phase: Phase = reduced ? "awake" : "intro";
  let timeline: ReturnType<typeof playIntro> | null = null;
  let holding = false;
  let charge = 0;
  let disposed = false;
  const setPhase = (next: Phase) => { phase = next; callbacks.onPhase?.(next); };
  const settle = () => {
    timeline?.kill(); timeline = null;
    settleDirector(director);
    Object.assign(goal, CAMERA_BASE);
    holding = false; charge = 0;
    setPhase("awake");
  };
  if (reduced) settle();
  else timeline = playIntro(director, goal, () => { timeline?.kill(); timeline = null; setPhase("awake"); });

  function metamorphose() {
    if (disposed || phase !== "awake") return false;
    holding = false; charge = 0;
    setPhase("sequence");
    callbacks.onSequence?.(true);
    timeline = playMetamorphosis(director, goal, reduced, () => {
      timeline?.kill(); timeline = null; setPhase("awake"); callbacks.onSequence?.(false);
    }, callbacks.onCue);
    return true;
  }
  return {
    director,
    get phase() { return phase; },
    get time() { return timeline?.totalTime() ?? 0; },
    get charge() { return charge; },
    step(dt: number) {
      if (disposed) return;
      const current = timeline;
      if (current) current.totalTime(Math.min(current.duration(), current.totalTime() + clamp(dt, 0, 0.25)), false);
      if (phase === "awake") {
        charge = clamp(charge + (holding ? dt / HOLD_SECONDS : -dt * 1.8));
        if (charge >= 1) metamorphose();
      }
    },
    hold(active: boolean) { holding = active && phase === "awake"; },
    setReduced(value: boolean) {
      if (value === reduced) return;
      reduced = value;
      if (value) {
        const sequencing = phase === "sequence";
        settle();
        if (sequencing) callbacks.onSequence?.(false);
      }
    },
    metamorphose,
    dispose() { disposed = true; timeline?.kill(); timeline = null; },
  };
}
