import { describe, expect, it } from "vitest";
import { createTemperament, stepTemperament, TIMING, type Sense, type Temperament } from "./behavior";

const calm: Sense = { dt: 0.1, present: true, near: false, speed: 0 };
const close: Sense = { dt: 0.1, present: true, near: true, speed: 0.2 };
const rush: Sense = { dt: 0.1, present: true, near: true, speed: TIMING.fast + 1 };
const absent: Sense = { dt: 0.1, present: false, near: false, speed: 0 };

function run(state: Temperament, sense: Sense, seconds: number) {
  let current = state;
  for (let elapsed = 0; elapsed < seconds; elapsed += sense.dt) current = stepTemperament(current, sense);
  return current;
}

describe("stepTemperament", () => {
  it("starts observing and stays there while the visitor is distant", () => {
    const state = run(createTemperament(), calm, 3);
    expect(state.mood).toBe("observing");
  });

  it("becomes curious when the visitor lingers close and calm", () => {
    const state = run(createTemperament(), close, TIMING.linger + 0.2);
    expect(state.mood).toBe("curious");
  });

  it("recoils from a fast approach, then turns away and eventually returns", () => {
    let state = run(createTemperament(), rush, 0.1);
    expect(state.mood).toBe("wary");

    state = run(state, close, TIMING.wary + 0.1);
    expect(state.mood).toBe("ignoring");
    expect(state.ignoreLeft).toBeGreaterThan(0);

    state = run(state, calm, TIMING.ignore + 0.5);
    expect(state.mood).toBe("observing");
  });

  it("dreams after the visitor has been gone long enough, and wakes when they return", () => {
    let state = run(createTemperament(), absent, TIMING.idle + 0.2);
    expect(state.mood).toBe("dreaming");
    state = stepTemperament(state, calm);
    expect(state.mood).toBe("observing");
  });

  it("builds attention while the visitor is close and lets it fade when they leave", () => {
    const near = run(createTemperament(), close, 1);
    expect(near.attention).toBeGreaterThan(0.5);
    const faded = run(near, absent, 3);
    expect(faded.attention).toBeLessThan(near.attention);
  });
});
