import { describe, expect, it } from "vitest";
import { SCULPTURE_STRIDE, parseGlb } from "./glb";

// Builds a one-triangle binary glTF so the parser is tested against the real container format.
function buildGlb({ translation }: { translation?: [number, number, number] }) {
  const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  const normals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const indices = new Uint16Array([0, 1, 2]);
  const bin = new Uint8Array(80);
  bin.set(new Uint8Array(positions.buffer), 0);
  bin.set(new Uint8Array(normals.buffer), 36);
  bin.set(new Uint8Array(indices.buffer), 72);

  const json = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, ...(translation ? { translation } : {}) }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [1, 0.5, 0.25, 1], metallicFactor: 0.8, roughnessFactor: 0.2 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 1, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: 3, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 36 },
      { buffer: 0, byteOffset: 36, byteLength: 36 },
      { buffer: 0, byteOffset: 72, byteLength: 6 },
    ],
    buffers: [{ byteLength: 80 }],
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json).padEnd(Math.ceil(JSON.stringify(json).length / 4) * 4, " "));
  const total = 12 + 8 + jsonBytes.length + 8 + bin.length;
  const out = new ArrayBuffer(total);
  const view = new DataView(out);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(out, 20, jsonBytes.length).set(jsonBytes);
  const binOffset = 20 + jsonBytes.length;
  view.setUint32(binOffset, bin.length, true);
  view.setUint32(binOffset + 4, 0x004e4942, true);
  new Uint8Array(out, binOffset + 8, bin.length).set(bin);
  return out;
}

describe("parseGlb", () => {
  it("reads positions, normals, indices and the PBR material of each vertex", () => {
    const model = parseGlb(buildGlb({}));
    expect(model.vertices.length).toBe(3 * SCULPTURE_STRIDE);
    expect(Array.from(model.indices)).toEqual([0, 1, 2]);
    const second = SCULPTURE_STRIDE;
    expect(model.vertices.slice(second + 6, second + 9)).toEqual(new Float32Array([1, 0.5, 0.25]));
    expect(model.vertices[second + 9]).toBeCloseTo(0.8);
    expect(model.vertices[second + 10]).toBeCloseTo(0.2);
  });

  it("applies node transforms, then centers and scales the sculpture to a unit bounding sphere", () => {
    const plain = parseGlb(buildGlb({}));
    const moved = parseGlb(buildGlb({ translation: [5, -2, 3] }));
    for (let i = 0; i < plain.vertices.length; i++) expect(moved.vertices[i]).toBeCloseTo(plain.vertices[i], 5);

    let radius = 0;
    for (let i = 0; i < plain.vertices.length; i += SCULPTURE_STRIDE) {
      radius = Math.max(radius, Math.hypot(plain.vertices[i], plain.vertices[i + 1], plain.vertices[i + 2]));
    }
    expect(radius).toBeCloseTo(1, 5);
  });

  it("rejects files that are not glTF 2.0 binaries", () => {
    const junk = new Uint8Array(32).buffer;
    expect(() => parseGlb(junk)).toThrow("not a GLB file");
  });
});
