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

export const CAMERA_BASE: CameraGoal = { distance: 13.2, orbit: 0.06, height: 0.035, fov: 34 };
export const CAMERA_INTRO: CameraGoal = { distance: 17.4, orbit: -0.24, height: 0.1, fov: 36 };
export const MIN_CAMERA_DISTANCE = 12.5;
export const HOLD_SECONDS = 1.25;

export type Quality = { shards: number; dust: number; pixelRatio: number };
export function qualityFor(compact: boolean): Quality {
  return compact
    ? { shards: 820, dust: 200, pixelRatio: 1.25 }
    : { shards: 1800, dust: 420, pixelRatio: 1.6 };
}
