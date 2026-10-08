import { damp } from "../../core/math";

// The entity's temperament is a small state machine driven by how the visitor
// behaves: lingering close is noticed, a fast approach makes it recoil, and after
// a recoil it turns away for a while. With no visitor for a while, it dreams.
export type Mood = "dreaming" | "observing" | "curious" | "wary" | "ignoring";

export const TIMING = {
  // Reach (scene units) at which the visitor's cursor counts as close.
  near: 1.1,
  // Cursor speed (scene units per second) that reads as a sudden approach.
  fast: 1.5,
  // Seconds of calm proximity before curiosity shows.
  linger: 1.6,
  // Seconds spent recoiling before turning away.
  wary: 1.1,
  // Seconds the entity ignores the visitor after recoiling.
  ignore: 5,
  // Seconds without a visitor before it starts dreaming.
  idle: 7,
};

export type Temperament = {
  mood: Mood;
  // Seconds spent in the current mood.
  timer: number;
  // Seconds the cursor has stayed close and calm.
  lingering: number;
  // Seconds of indifference left.
  ignoreLeft: number;
  // Seconds since the visitor was last present.
  idle: number;
  // 0 to 1. Rises while the visitor is close, falls slowly after.
  attention: number;
};

export type Sense = {
  dt: number;
  present: boolean;
  near: boolean;
  speed: number;
};

export function createTemperament(): Temperament {
  return { mood: "observing", timer: 0, lingering: 0, ignoreLeft: 0, idle: 0, attention: 0 };
}

export function stepTemperament(state: Temperament, sense: Sense): Temperament {
  const { dt } = sense;
  let { mood, timer, lingering, ignoreLeft } = state;
  const idle = sense.present ? 0 : state.idle + dt;
  const attention = sense.present && sense.near
    ? Math.min(1, state.attention + dt * 1.8)
    : Math.max(0, state.attention - dt * 0.9);

  const become = (next: Mood) => {
    if (next === mood) return;
    mood = next;
    timer = 0;
  };

  timer += dt;

  if (mood === "ignoring") {
    ignoreLeft -= dt;
    if (ignoreLeft <= 0) become("observing");
  } else if (mood === "wary") {
    if (timer >= TIMING.wary) {
      ignoreLeft = TIMING.ignore;
      become("ignoring");
    }
  } else {
    if (mood === "dreaming" && sense.present) become("observing");

    if (sense.present && sense.near && sense.speed > TIMING.fast) {
      lingering = 0;
      become("wary");
    } else if (sense.present && sense.near) {
      lingering += dt;
      if (lingering >= TIMING.linger) become("curious");
    } else {
      lingering = 0;
      if (mood === "curious") become("observing");
    }

    if (!sense.present && idle >= TIMING.idle) become("dreaming");
  }

  return { mood, timer, lingering, ignoreLeft, idle, attention };
}

// How the entity behaves in each mood. The scene reads these numbers every frame
// and eases toward them, so mood changes never snap.
export type Intent = {
  // 0 to 1. How much the entity turns toward the visitor.
  gaze: number;
  // -1 recoils, 0 holds, 1 leans toward the visitor.
  lean: number;
  // Strength of the core light.
  light: number;
  // 0 frost, 1 ember.
  warmth: number;
  // Multiplier for how strongly shards react to the cursor.
  reactivity: number;
  // True while the entity has turned away.
  away: boolean;
};

const INTENTS: Record<Mood, Intent> = {
  // Warmth is kept near the ends: ember and frost mixed at the middle read as pink.
  dreaming: { gaze: 0, lean: 0, light: 0.3, warmth: 0.2, reactivity: 0.25, away: false },
  observing: { gaze: 0.55, lean: 0, light: 0.55, warmth: 1, reactivity: 1, away: false },
  curious: { gaze: 1, lean: 1, light: 1, warmth: 1, reactivity: 0.8, away: false },
  wary: { gaze: 0.7, lean: -1, light: 1.7, warmth: 0, reactivity: 1.8, away: false },
  ignoring: { gaze: 0, lean: -0.5, light: 0.15, warmth: 0, reactivity: 0.2, away: true },
};

export function intentFor(mood: Mood): Intent {
  return INTENTS[mood];
}

// Eases an intent value toward its target. Used by the scene for smooth changes.
export function easeIntent(current: Intent, target: Intent, dt: number): Intent {
  const rate = 3;
  return {
    gaze: damp(current.gaze, target.gaze, rate, dt),
    lean: damp(current.lean, target.lean, rate, dt),
    light: damp(current.light, target.light, rate, dt),
    warmth: damp(current.warmth, target.warmth, rate, dt),
    reactivity: damp(current.reactivity, target.reactivity, rate, dt),
    away: target.away,
  };
}

export const MOOD_LABELS: Record<Mood, string> = {
  dreaming: "sonhando",
  observing: "observando",
  curious: "curiosidade",
  wary: "recuo",
  ignoring: "indiferença",
};
