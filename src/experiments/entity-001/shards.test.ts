import { describe, expect, it } from "vitest";
import { Matrix4, Vector3 } from "three";
import { createRings, createShell } from "./geometry";
import { ENTITY } from "./config";
import { ShardSwarm, type SwarmInput } from "./shards";

const DT = 1 / 60;

function input(overrides: Partial<SwarmInput>): SwarmInput {
  return {
    dt: DT,
    elapsed: 0,
    morph: 0,
    disperse: 0,
    reveal: 1,
    motion: 0,
    cursor: null,
    cursorSpeed: 0,
    reactivity: 1,
    glow: 0,
    ...overrides,
  };
}

function matrices(swarm: ShardSwarm, count: number) {
  const matrix = new Matrix4();
  return Array.from({ length: count }, (_, index) => {
    swarm.mesh.getMatrixAt(index, matrix);
    return matrix.elements.slice();
  });
}

function maxDeviation(a: number[][], b: number[][]) {
  let worst = 0;
  a.forEach((row, index) => row.forEach((value, column) => {
    worst = Math.max(worst, Math.abs(value - b[index][column]));
  }));
  return worst;
}

describe("ShardSwarm", () => {
  const slots = createShell(160, ENTITY.radius, ENTITY.aperture, 3);
  const rings = createRings(slots.length, ENTITY.radius);

  it("pushes shards away from the cursor and reconstructs them over time", () => {
    const pushed = new ShardSwarm(slots, rings, ENTITY.radius, 3);
    const resting = new ShardSwarm(slots, rings, ENTITY.radius, 3);
    const cursor = slots[0].position.clone();

    for (let i = 0; i < 20; i++) {
      pushed.update(input({ elapsed: i * DT, cursor, cursorSpeed: 2 }));
    }
    expect(maxDeviation(matrices(pushed, slots.length), matrices(resting, slots.length))).toBeGreaterThan(0.01);

    for (let i = 20; i < 60 * 8; i++) {
      pushed.update(input({ elapsed: i * DT }));
      resting.update(input({ elapsed: i * DT }));
    }
    expect(maxDeviation(matrices(pushed, slots.length), matrices(resting, slots.length))).toBeLessThan(0.02);
  });

  it("scatters shards outward when a tap bursts them", () => {
    const burst = new ShardSwarm(slots, rings, ENTITY.radius, 3);
    const calm = new ShardSwarm(slots, rings, ENTITY.radius, 3);
    burst.burst(new Vector3(0, 0, ENTITY.radius), 2.4);
    for (let i = 0; i < 30; i++) {
      burst.update(input({ elapsed: i * DT }));
      calm.update(input({ elapsed: i * DT }));
    }
    expect(maxDeviation(matrices(burst, slots.length), matrices(calm, slots.length))).toBeGreaterThan(0.05);
  });

  it("releases its GPU resources on dispose", () => {
    const swarm = new ShardSwarm(slots, rings, ENTITY.radius, 3);
    expect(() => swarm.dispose()).not.toThrow();
  });
});
