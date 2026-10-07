import { SCULPTURE_STRIDE, type SculptureModel } from "./glb";

// Interleaved particle layout: position (3), normal (3), base color (3),
// then a per-particle seed (4) for flow phase, lift, sparkle and size.
export const PARTICLE_STRIDE = 13;

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Scatters particles over the triangles by area, so dust leaves the surface
// at the same density everywhere instead of bunching on small faces.
export function sampleSurface(model: SculptureModel, count: number, seed = 7): Float32Array {
  const { vertices, indices } = model;
  const triangles = indices.length / 3;
  const cumulative = new Float64Array(triangles);
  let total = 0;
  for (let t = 0; t < triangles; t++) {
    total += triangleArea(vertices, indices, t);
    cumulative[t] = total;
  }

  const random = mulberry32(seed);
  const out = new Float32Array(count * PARTICLE_STRIDE);
  for (let p = 0; p < count; p++) {
    const triangle = pickTriangle(cumulative, random() * total);
    // Uniform barycentric sampling: the square root keeps points evenly spread.
    const root = Math.sqrt(random());
    const w0 = 1 - root;
    const w1 = random() * root;
    const w2 = 1 - w0 - w1;
    const a = indices[triangle * 3] * SCULPTURE_STRIDE;
    const b = indices[triangle * 3 + 1] * SCULPTURE_STRIDE;
    const c = indices[triangle * 3 + 2] * SCULPTURE_STRIDE;
    const target = p * PARTICLE_STRIDE;
    // The first nine floats of a vertex (position, normal, color) match the
    // first nine floats of a particle, so they interpolate in one pass.
    for (let k = 0; k < 9; k++) {
      out[target + k] = w0 * vertices[a + k] + w1 * vertices[b + k] + w2 * vertices[c + k];
    }
    const nx = out[target + 3], ny = out[target + 4], nz = out[target + 5];
    const length = Math.hypot(nx, ny, nz) || 1;
    out[target + 3] = nx / length; out[target + 4] = ny / length; out[target + 5] = nz / length;
    out[target + 9] = random();
    out[target + 10] = random();
    out[target + 11] = random();
    out[target + 12] = random();
  }
  return out;
}

function triangleArea(vertices: Float32Array, indices: Uint32Array, triangle: number): number {
  const a = indices[triangle * 3] * SCULPTURE_STRIDE;
  const b = indices[triangle * 3 + 1] * SCULPTURE_STRIDE;
  const c = indices[triangle * 3 + 2] * SCULPTURE_STRIDE;
  const ux = vertices[b] - vertices[a], uy = vertices[b + 1] - vertices[a + 1], uz = vertices[b + 2] - vertices[a + 2];
  const vx = vertices[c] - vertices[a], vy = vertices[c + 1] - vertices[a + 1], vz = vertices[c + 2] - vertices[a + 2];
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  return Math.hypot(cx, cy, cz) / 2;
}

function pickTriangle(cumulative: Float64Array, target: number): number {
  let low = 0, high = cumulative.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (cumulative[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}
