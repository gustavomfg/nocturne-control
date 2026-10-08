import { gsap } from "gsap";
import type { CameraGoal } from "../../core/camera";
import { CAMERA_BASE } from "./config";

// Plain numbers that the scene reads every frame. GSAP timelines tween them, so
// the choreography lives here and the renderer only consumes its results.
export type Director = {
  // 0 to 1. How far the shards have materialized during the intro.
  reveal: number;
  // 0 to 1. How lit the core is during the intro.
  core: number;
  // 0 shell, 1 rings.
  morph: number;
  // 0 assembled, 1 scattered outward.
  disperse: number;
  // 0 to 1. Flash of light during the metamorphosis; also adds tremor.
  flash: number;
};

export function createDirector(): Director {
  return { reveal: 0, core: 0, morph: 0, disperse: 0, flash: 0 };
}

// Emergence from darkness: the core ignites first, the shell materializes from
// bottom to top, and the camera settles from far away into its resting distance.
export function playIntro(director: Director, goal: CameraGoal, onDone: () => void) {
  return gsap.timeline({ onComplete: onDone })
    .to(director, { core: 1, duration: 2.6, ease: "power2.out" }, 0.4)
    .to(director, { reveal: 1, duration: 5.4, ease: "power2.inOut" }, 1.5)
    .to(goal, { distance: CAMERA_BASE.distance, fov: CAMERA_BASE.fov, orbit: CAMERA_BASE.orbit, height: CAMERA_BASE.height, duration: 7.2, ease: "power3.out" }, 0);
}

// Metamorphosis: the entity tenses, the shell scatters, the matter gathers into
// three orbital rings, holds, and returns. Under reduced motion only the light moves.
export function playMetamorphosis(director: Director, goal: CameraGoal, reduced: boolean, onDone: () => void) {
  const timeline = gsap.timeline({ onComplete: onDone });
  if (reduced) {
    return timeline
      .to(director, { flash: 1, duration: 0.5, ease: "power2.out" })
      .to(director, { flash: 0, duration: 1.6, ease: "power2.inOut" });
  }
  return timeline
    .to(director, { flash: 0.9, duration: 0.7, ease: "power2.in" }, 0)
    .to(goal, { distance: CAMERA_BASE.distance + 3, fov: CAMERA_BASE.fov + 6, duration: 0.9, ease: "power2.inOut" }, 0)
    .to(director, { disperse: 1, duration: 1.2, ease: "expo.out" }, 0.8)
    .to(director, { flash: 0.12, duration: 1.4, ease: "power2.out" }, 1.4)
    .to(director, { morph: 1, duration: 2.2, ease: "power3.inOut" }, 2.1)
    .to(goal, { orbit: `+=${(Math.PI * 0.8).toFixed(3)}`, distance: CAMERA_BASE.distance - 2.2, duration: 3.6, ease: "sine.inOut" }, 2.0)
    .to(director, { morph: 0, duration: 1.9, ease: "power3.inOut" }, 5.4)
    .to(goal, { orbit: `+=${(0.6).toFixed(3)}`, distance: CAMERA_BASE.distance, fov: CAMERA_BASE.fov, duration: 2.6, ease: "power2.inOut" }, 5.4)
    .to(director, { disperse: 0, duration: 1.8, ease: "expo.inOut" }, 6.0)
    .to(director, { flash: 0, duration: 1.2, ease: "power2.out" }, 6.6);
}
