import { clamp, damp } from "../../core/math";

export type Mood = "dreaming" | "observing" | "curious" | "wary" | "ignoring" | "alert" | "disturbed";

export const TIMING = {
  near: 0.95, fast: 6, calm: 0.65, linger: 2.3,
  wary: 1.35, ignore: 4.8, idle: 9,
  alert: 2.2, disturbed: 2.8,
};

export type Temperament = {
  mood: Mood; timer: number; lingering: number; ignoreLeft: number;
  idle: number; attention: number; stress: number; still: number;
};
export type Sense = { dt: number; present: boolean; near: boolean; speed: number; contact?: boolean };

export function createTemperament(): Temperament {
  return { mood: "observing", timer: 0, lingering: 0, ignoreLeft: 0, idle: 0, attention: 0, stress: 0, still: 0 };
}

// Stress is memory, not a switch: repeated intrusions escalate, and calm restores trust.
// Minimum dwell times keep a gesture from flickering through several moods in one second.
export function stepTemperament(state: Temperament, sense: Sense): Temperament {
  const dt = clamp(sense.dt, 0, 0.25);
  const rushing = sense.present && sense.near && sense.speed > TIMING.fast;
  const calm = sense.present && sense.near && sense.speed < TIMING.calm;
  const idle = sense.present ? 0 : state.idle + dt;
  const still = calm ? state.still + dt : Math.max(0, state.still - dt * 2);
  const stress = clamp(state.stress + (rushing ? 1.7 : sense.contact ? 2.8 : -0.24) * dt, 0, 4);
  const attention = damp(state.attention, calm ? 1 : sense.present ? 0.4 : 0, calm ? 0.65 : 0.25, dt);
  let { mood, timer, lingering, ignoreLeft } = state;
  timer += dt;
  const become = (next: Mood) => {
    if (next !== mood) { mood = next; timer = 0; }
  };

  if (mood === "ignoring") {
    ignoreLeft = Math.max(0, ignoreLeft - dt);
    lingering = 0;
    if (ignoreLeft === 0) become(idle >= TIMING.idle ? "dreaming" : "observing");
  } else if (mood === "disturbed") {
    if (timer >= TIMING.disturbed) { ignoreLeft = TIMING.ignore + 1.8; become("ignoring"); }
  } else if (mood === "alert") {
    if (stress > 2.6) become("disturbed");
    else if (timer >= TIMING.alert && !rushing) { ignoreLeft = TIMING.ignore * 0.7; become("ignoring"); }
  } else if (mood === "wary") {
    if (stress > 1.45) become("alert");
    else if (timer >= TIMING.wary) { ignoreLeft = TIMING.ignore; become("ignoring"); }
  } else {
    if (rushing || sense.contact) {
      lingering = 0;
      become(stress > 2.6 ? "disturbed" : stress > 1.45 ? "alert" : "wary");
    } else if (calm) {
      lingering += dt;
      if (lingering >= TIMING.linger) become("curious");
      else if (mood === "dreaming") become("observing");
    } else {
      lingering = Math.max(0, lingering - dt * 2);
      if (mood === "curious" && lingering === 0) become("observing");
      if (mood === "dreaming" && sense.present) become("observing");
    }
    if (!sense.present && idle >= TIMING.idle) become("dreaming");
  }
  return { mood, timer, lingering, ignoreLeft, idle, attention, stress, still };
}

export type Intent = {
  gaze: number; lean: number; light: number; warmth: number; reactivity: number;
  away: boolean; openness: number; rhythm: number; tremor: number;
  tilt: number; roll: number; spread: number; camera: number; orbit: number;
};

const INTENTS: Record<Mood, Intent> = {
  dreaming:  { gaze: 0, lean: -0.1, light: 0.22, warmth: 0.9, reactivity: 0.1, away: false, openness: 0.18, rhythm: 0.5, tremor: 0, tilt: 0.14, roll: -0.05, spread: -0.035, camera: 0.65, orbit: 0.13 },
  observing: { gaze: 0.58, lean: 0, light: 0.7, warmth: 1, reactivity: 0.6, away: false, openness: 0.72, rhythm: 0.8, tremor: 0, tilt: 0, roll: 0, spread: 0, camera: 0, orbit: 0 },
  curious:   { gaze: 0.95, lean: 0.35, light: 0.98, warmth: 1, reactivity: 0.35, away: false, openness: 1, rhythm: 0.58, tremor: 0, tilt: -0.08, roll: 0.07, spread: 0.055, camera: -1.35, orbit: -0.12 },
  wary:      { gaze: 0.8, lean: -0.65, light: 1, warmth: 0.15, reactivity: 1.4, away: false, openness: 0.43, rhythm: 1.5, tremor: 0.3, tilt: 0.08, roll: -0.09, spread: 0.15, camera: 1, orbit: 0.16 },
  ignoring:  { gaze: 0, lean: -0.4, light: 0.16, warmth: 0.05, reactivity: 0.12, away: true, openness: 0.12, rhythm: 0.45, tremor: 0, tilt: -0.12, roll: 0.1, spread: -0.025, camera: 0.8, orbit: 0.12 },
  alert:     { gaze: 0.9, lean: -0.4, light: 1.15, warmth: 0.05, reactivity: 1.8, away: false, openness: 0.56, rhythm: 2, tremor: 0.65, tilt: -0.05, roll: -0.12, spread: 0.22, camera: 1.2, orbit: -0.18 },
  disturbed: { gaze: 0.35, lean: -0.85, light: 1.25, warmth: 0, reactivity: 2.2, away: false, openness: 0.3, rhythm: 2.8, tremor: 1, tilt: 0.22, roll: 0.16, spread: 0.3, camera: 1.9, orbit: 0.22 },
};
export function intentFor(mood: Mood): Intent { return { ...INTENTS[mood] }; }
export function easeIntent(current: Intent, target: Intent, dt: number): Intent {
  const next = { ...target };
  for (const key of Object.keys(target) as (keyof Intent)[]) {
    if (key !== "away") next[key] = damp(current[key], target[key], 1.8, dt);
  }
  return next;
}
export const MOOD_LABELS: Record<Mood, string> = {
  dreaming: "sonhando", observing: "observando", curious: "curiosa",
  wary: "recuando", ignoring: "indiferente", alert: "alerta", disturbed: "perturbada",
};
