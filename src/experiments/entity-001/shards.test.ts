import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import { createShell } from "./geometry";
import { ENTITY } from "./config";
import { ShardSwarm } from "./shards";

describe("assembled procedural fallback", () => {
  const slots = createShell(160, ENTITY.radius, ENTITY.aperture, 3);
  it("keeps every facet attached to the capsule through the controlled opening", () => {
    const shell = new ShardSwarm(slots, ENTITY.radius);
    const matrix = new Matrix4();
    for (let frame=0; frame<120; frame++) {
      shell.update({ dt:1/60, reveal:1, motion:1, glow:0.9, opening:0.14, breath:Math.sin(frame/60) });
      for (let i=0; i<slots.length; i++) {
        shell.mesh.getMatrixAt(i,matrix);
        expect(new Vector3().setFromMatrixPosition(matrix).distanceTo(slots[i].position)).toBeLessThan(0.025);
      }
    }
    shell.dispose();
  });
  it("is spatially invariant under reduced motion", () => {
    const shell = new ShardSwarm(slots, ENTITY.radius);
    const matrix = new Matrix4();
    shell.update({ dt:1/60, reveal:1, motion:0, glow:0.9, opening:0.14, breath:1 });
    shell.mesh.getMatrixAt(0,matrix);
    expect(new Vector3().setFromMatrixPosition(matrix).distanceTo(slots[0].position)).toBeLessThan(0.00001);
    shell.dispose();
  });
  it("releases GPU resources", () => {
    const shell = new ShardSwarm(slots, ENTITY.radius);
    expect(() => shell.dispose()).not.toThrow();
  });
});
