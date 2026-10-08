import type { CameraGoal } from "../../core/camera";

// Everything that shapes ENTITY 001 lives here, so the look can be tuned without
// touching the behavior code. Lengths are in scene units; the shell radius is 2.1.
export const ENTITY = {
  // Radius of the shell of shards.
  radius: 2.1,
  // Angular radius (radians) of the open face that turns toward the visitor.
  aperture: 0.46,
  palette: {
    graphite: "#525764",
    ember: "#ffa155",
    frost: "#a8c8ff",
    ivory: "#fff1dc",
    void: "#030304",
  },
} as const;

export const CAMERA_BASE: CameraGoal = { distance: 10.5, orbit: 0, height: 0.16, fov: 30 };
export const CAMERA_INTRO: CameraGoal = { distance: 30, orbit: -0.7, height: 0.34, fov: 46 };

export type Quality = {
  shards: number;
  dust: number;
  pixelRatio: number;
};

// Counts are reduced on narrow screens, where fill rate is the first limit to reach.
export function qualityFor(compact: boolean): Quality {
  return compact
    ? { shards: 1100, dust: 1100, pixelRatio: 1.25 }
    : { shards: 2400, dust: 2600, pixelRatio: 1.6 };
}
