import { describe, expect, it } from "vitest";
import { SCULPTURE_STRIDE, type SculptureModel } from "./glb";
import { PARTICLE_STRIDE, sampleSurface } from "./surfaceSampling";

// Each vertex is position (3), normal (3), color (3) and material (2).
function vertex(x: number, y: number, z: number, color: [number, number, number]) {
  return [x, y, z, 0, 0, 1, ...color, 0, 0.5];
}

function modelFrom(triangles: number[][][]): SculptureModel {
  const vertices: number[] = [];
  const indices: number[] = [];
  for (const triangle of triangles) {
    for (const point of triangle) {
      indices.push(vertices.length / SCULPTURE_STRIDE);
      vertices.push(...point);
    }
  }
  return { vertices: new Float32Array(vertices), indices: new Uint32Array(indices) };
}

describe("sampleSurface", () => {
  it("places every particle on the surface with its interpolated normal and color", () => {
    const red: [number, number, number] = [1, 0, 0];
    const model = modelFrom([[vertex(0, 0, 0, red), vertex(1, 0, 0, red), vertex(0, 1, 0, red)]]);
    const particles = sampleSurface(model, 500, 3);
    expect(particles.length).toBe(500 * PARTICLE_STRIDE);
    for (let p = 0; p < 500; p++) {
      const at = p * PARTICLE_STRIDE;
      const x = particles[at], y = particles[at + 1], z = particles[at + 2];
      expect(Math.abs(z)).toBeLessThan(1e-6);
      expect(x).toBeGreaterThanOrEqual(-1e-6);
      expect(y).toBeGreaterThanOrEqual(-1e-6);
      expect(x + y).toBeLessThanOrEqual(1 + 1e-6);
      expect(particles[at + 5]).toBeCloseTo(1);
      expect(particles[at + 6]).toBeCloseTo(1);
      for (let seed = 9; seed < 13; seed++) expect(particles[at + seed]).toBeGreaterThanOrEqual(0);
    }
  });

  it("spreads particles by area, so a larger face receives proportionally more dust", () => {
    const white: [number, number, number] = [1, 1, 1];
    // The first triangle has area 0.5 and the second has area 1.5, so three quarters of samples belong to the second.
    const model = modelFrom([
      [vertex(0, 0, 0, white), vertex(1, 0, 0, white), vertex(0, 1, 0, white)],
      [vertex(0, 10, 0, white), vertex(3, 10, 0, white), vertex(0, 11, 0, white)],
    ]);
    const count = 4000;
    const particles = sampleSurface(model, count, 11);
    let inLarge = 0;
    for (let p = 0; p < count; p++) if (particles[p * PARTICLE_STRIDE + 1] > 5) inLarge++;
    expect(inLarge / count).toBeGreaterThan(0.7);
    expect(inLarge / count).toBeLessThan(0.8);
  });
});
