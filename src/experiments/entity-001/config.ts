import type { CameraGoal } from "../../core/camera";

export const ENTITY = {
  radius: 2.1,
  aperture: 0.46,
  eye: { width: 0.69, height: 0.23, y: 0.12, z: 1.55 },
  palette: {
    graphite: "#424a55",
    ember: "#ed9b56",
    frost: "#93b8cb",
    ivory: "#eee2c8",
    void: "#030304",
  },
} as const;

export const CAMERA_BASE: CameraGoal = { distance: 11.8, orbit: 0.04, height: 0.06, fov: 34 };
export const CAMERA_INTRO: CameraGoal = { distance: 19, orbit: -0.58, height: 0.22, fov: 38 };
export const HOLD_SECONDS = 1.25;

export type Quality = { shards: number; dust: number; pixelRatio: number };
export function qualityFor(compact: boolean): Quality {
  return compact
    ? { shards: 820, dust: 430, pixelRatio: 1.25 }
    : { shards: 1800, dust: 980, pixelRatio: 1.6 };
}
