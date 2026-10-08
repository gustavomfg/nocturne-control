import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createRings, createShell } from "./geometry";
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

  it("keeps the open face free: no shard sits inside the aperture", () => {
    const apertureCos = Math.cos(ENTITY.aperture);
    for (const slot of slots) {
      const direction = slot.position.clone().normalize();
      expect(direction.z).toBeLessThanOrEqual(apertureCos + 1e-9);
    }
  });

  it("lies near the shell radius", () => {
    for (const slot of slots) {
      expect(slot.position.length()).toBeGreaterThan(ENTITY.radius * 0.85);
      expect(slot.position.length()).toBeLessThan(ENTITY.radius * 1.15);
    }
  });

  it("is deterministic for the same seed", () => {
    const again = createShell(1200, ENTITY.radius, ENTITY.aperture);
    expect(again[10].position.toArray()).toEqual(slots[10].position.toArray());
  });
});

describe("createRings", () => {
  const count = 900;
  const rings = createRings(count, ENTITY.radius);

  it("matches the shell count, so every shard has a target during the morph", () => {
    expect(rings).toHaveLength(count);
  });

  it("places shards on three bands around the origin", () => {
    const radii = rings.map((slot) => slot.position.length());
    expect(Math.min(...radii)).toBeGreaterThan(ENTITY.radius);
    expect(Math.max(...radii)).toBeLessThan(ENTITY.radius * 1.3);
  });

  it("orients each ring shard tangentially, with its thin axis pointing radially", () => {
    const slot = rings[0];
    const radial = slot.position.clone().normalize();
    const thin = new Vector3(0, 1, 0).applyQuaternion(slot.orientation);
    expect(Math.abs(thin.dot(radial))).toBeGreaterThan(0.99);
  });
});
