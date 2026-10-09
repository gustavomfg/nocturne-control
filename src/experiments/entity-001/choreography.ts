import { gsap } from "gsap";
import type { CameraGoal } from "../../core/camera";
import { CAMERA_BASE } from "./config";

export type Director = {
  reveal: number; core: number; morph: number; disperse: number; flash: number;
  eye: number; key: number; rim: number; atmosphere: number; dive: number;
  evolution: number; contraction: number; scan: number;
};
export const INTRO_DURATION = 11.8;
export const METAMORPHOSIS_DURATION = 12.6;

export function createDirector(): Director {
  return { reveal: 0, core: 0, morph: 0, disperse: 0, flash: 0, eye: 0.12,
    key: 0, rim: 0, atmosphere: 0, dive: 0, evolution: 0, contraction: 0, scan: -1 };
}
export function settleDirector(director: Director) {
  Object.assign(director, { reveal: 1, core: 1, morph: 0, disperse: 0, flash: 0,
    eye: 1, key: 1, rim: 1, atmosphere: 1, dive: 0, contraction: 0, scan: 2 });
}

// Timelines remain paused. The visible scene advances their playhead with its own
// delta, so a hidden tab pauses the film as well as the renderer.
export function playIntro(director: Director, goal: CameraGoal, onDone: () => void) {
  return gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" }, onComplete: onDone })
    .addLabel("trace", 0.3)
    .to(director, { rim: 1, atmosphere: 0.65, duration: 2 }, "trace")
    .to(director, { key: 0.18, duration: 1.8 }, 0.6)
    .to(director, { reveal: 0.38, duration: 3.2 }, 0.5)
    .to(director, { core: 0.28, duration: 1.4 }, 1.2)
    .to(director, { scan: 1.4, duration: 6.8, ease: "none" }, 0.6)
    .to(goal, { distance: 12.9, orbit: 0.32, height: 0.13, fov: 35, duration: 6.4 }, 0)
    .addLabel("material", 3.4)
    .to(director, { reveal: 1, key: 0.8, duration: 4.6 }, "material")
    .to(director, { core: 0.75, eye: 0.38, duration: 3.5 }, 4.3)
    .addLabel("recognition", 8)
    .to(director, { core: 1, eye: 1, rim: 1, key: 1, atmosphere: 1, duration: 3.8 }, "recognition")
    .to(goal, { ...CAMERA_BASE, duration: 5.4 }, 6.4);
}

export function playMetamorphosis(director: Director, goal: CameraGoal, reduced: boolean, onDone: () => void, onCue?: () => void) {
  const timeline = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" }, onComplete: onDone });
  if (reduced) {
    return timeline.to(director, { flash: 0.28, duration: 0.65 })
      .to(director, { flash: 0, duration: 1.55 });
  }
  return timeline
    .addLabel("anticipation", 0)
    .to(director, { contraction: 0.14, eye: 0.14, key: 0.35, flash: 0.2, duration: 1.15 }, 0)
    .to(goal, { distance: 13.7, orbit: -0.24, height: 0.12, duration: 1.9 }, 0)
    .addLabel("rupture", 1.2)
    .call(() => onCue?.(), [], "rupture")
    .to(director, { disperse: 1.45, contraction: 0, eye: 1, atmosphere: 1.5, duration: 1.9, ease: "power3.out" }, "rupture")
    .to(director, { morph: 1, flash: 0.35, duration: 2.8 }, 2)
    .addLabel("threshold", 3.8)
    .to(goal, { distance: 2.1, orbit: 0.06, height: 0.035, fov: 58, duration: 3.2, ease: "power2.inOut" }, "threshold")
    .to(director, { dive: 1, core: 0.68, flash: 0.04, duration: 2.4 }, "threshold")
    .addLabel("inside", 7)
    .to(goal, { orbit: 0.28, distance: 2.4, height: -0.03, duration: 1.4 }, "inside")
    .to(director, { evolution: 1, duration: 1.4 }, "inside")
    .call(() => onCue?.(), [], 8.4)
    .addLabel("return", 8.4)
    .to(goal, { ...CAMERA_BASE, orbit: -0.12, duration: 4.2 }, "return")
    .to(director, { morph: 0, disperse: 0, dive: 0, key: 1, core: 1, flash: 0, atmosphere: 1, duration: 3.8, ease: "power3.inOut" }, 8.8);
}
