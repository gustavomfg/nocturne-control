import { describe, expect, it } from "vitest";
import { fromTranslationRotationScale, identity, multiply, normalMatrix, rotationY, scaling, transformPoint } from "./mat4";

describe("mat4", () => {
  it("multiplies in column-major order", () => {
    const moved = multiply(fromTranslationRotationScale([1, 2, 3], [0, 0, 0, 1], [1, 1, 1]), scaling(2));
    expect(transformPoint(moved, 1, 0, 0)).toEqual([3, 2, 3]);
  });

  it("keeps normals perpendicular under uneven scale, and leaves pure rotation unchanged", () => {
    const stretched = scaling(1);
    stretched[0] = 2;
    const normal = normalMatrix(stretched);
    expect(normal[0]).toBeCloseTo(0.5);
    expect(normal[5]).toBeCloseTo(1);

    const turn = rotationY(0.7);
    const inverseTranspose = normalMatrix(turn);
    for (let i = 0; i < 16; i++) expect(inverseTranspose[i]).toBeCloseTo(turn[i], 6);
  });

  it("uses the glTF quaternion convention for rotations", () => {
    const quarterTurnAroundY = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
    const [x, y, z] = transformPoint(fromTranslationRotationScale([0, 0, 0], quarterTurnAroundY, [1, 1, 1]), 1, 0, 0);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(0, 6);
    expect(z).toBeCloseTo(-1, 6);
    expect(identity()[15]).toBe(1);
  });
});
