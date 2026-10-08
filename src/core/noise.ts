// Cheap, smooth pseudo-noise in [-1, 1]. Four sines with unrelated frequencies
// read as organic drift and never repeat visibly. The GLSL twin below uses the
// same formula, so CPU and GPU motion stay in agreement.
export function wobble(x: number, y: number, z: number, t: number) {
  return (
    Math.sin(x * 1.13 + t * 0.61) +
    Math.sin(y * 1.71 - t * 0.47 + 1.3) +
    Math.sin(z * 2.37 + t * 0.83 + 2.1) +
    Math.sin((x + y) * 0.93 - t * 0.29 + z * 0.7)
  ) / 4;
}

export const GLSL_WOBBLE = /* glsl */ `
float wobble(vec3 p, float t) {
  return (
    sin(p.x * 1.13 + t * 0.61) +
    sin(p.y * 1.71 - t * 0.47 + 1.3) +
    sin(p.z * 2.37 + t * 0.83 + 2.1) +
    sin((p.x + p.y) * 0.93 - t * 0.29 + p.z * 0.7)
  ) * 0.25;
}
`;
