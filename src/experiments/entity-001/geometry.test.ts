import { describe, expect, it } from "vitest";
import { createShell } from "./geometry";
import { ENTITY } from "./config";

describe("createShell", () => {
  const slots = createShell(1200, ENTITY.radius, ENTITY.aperture);

  it("returns the requested number of shards, all with valid sizes and orientations", () => {
    expect(slots).toHaveLength(1200);
    for (const slot of slots) {
      expect(slot.size).toBeGreaterThan(0);
      expect(slot.size).toBeLessThan(0.5);
      expect(Math.abs(slot.orientation.length() - 1)).toBeLessThan(1e-6);
    }
  });

  it("leaves the central almond aperture free of shell plates", () => {
    for (const slot of slots) {
      const p = slot.position;
      expect(p.z > 1.25 && Math.abs(p.x) < 0.65 && Math.abs(p.y - ENTITY.eye.y) < 0.18).toBe(false);
    }
  });

  it("has a taller crown and a narrower jaw than a spherical particle cloud", () => {
    const ys = slots.map(s => s.position.y);
    const xs = slots.map(s => s.position.x);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan((Math.max(...xs) - Math.min(...xs)) * 1.25);
    const jaw = slots.filter(s => s.position.y < -1.4);
    const temples = slots.filter(s => s.position.y > 0 && s.position.y < 1);
    expect(Math.max(...jaw.map(s => Math.abs(s.position.x)))).toBeLessThan(Math.max(...temples.map(s => Math.abs(s.position.x))) * 0.8);
    expect(Math.min(...ys)).toBeLessThan(-2.5);
    expect(Math.max(...ys)).toBeGreaterThan(2.5);
  });

  it("is deterministic for the same seed", () => {
    const again = createShell(1200, ENTITY.radius, ENTITY.aperture);
    expect(again[10].position.toArray()).toEqual(slots[10].position.toArray());
  });
});
