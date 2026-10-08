import { describe, expect, it } from "vitest";
import { wobble } from "./noise";

describe("wobble", () => {
  it("stays within [-1, 1] and is deterministic", () => {
    for (let i = 0; i < 400; i++) {
      const x = Math.sin(i) * 9;
      const y = Math.cos(i * 0.7) * 9;
      const z = Math.sin(i * 1.3) * 9;
      const value = wobble(x, y, z, i * 0.05);
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
      expect(wobble(x, y, z, i * 0.05)).toBe(value);
    }
  });
});
