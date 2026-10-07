import { fromTranslationRotationScale, identity, multiply, normalMatrix, transformPoint, type Mat4 } from "./mat4";

// Interleaved vertex layout shared with the renderer:
// position (3), normal (3), base color (3), metallic and roughness (2).
export const SCULPTURE_STRIDE = 11;

export type SculptureModel = {
  vertices: Float32Array;
  indices: Uint32Array;
};

type GltfAccessor = { bufferView?: number; byteOffset?: number; componentType: number; count: number; type: string };
type GltfBufferView = { byteOffset?: number; byteStride?: number };
type GltfPrimitive = { attributes: Record<string, number>; indices?: number; material?: number; mode?: number };
type GltfNode = {
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
};
type GltfMaterial = {
  pbrMetallicRoughness?: { baseColorFactor?: number[]; metallicFactor?: number; roughnessFactor?: number };
};
type GltfJson = {
  accessors: GltfAccessor[];
  bufferViews: GltfBufferView[];
  meshes?: { primitives: GltfPrimitive[] }[];
  nodes?: GltfNode[];
  materials?: GltfMaterial[];
  scenes?: { nodes?: number[] }[];
  scene?: number;
};

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const TRIANGLES = 4;
const COMPONENT_COUNT: Record<string, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const FLOAT = 5126;

type Primitive = { positions: Float32Array; normals: Float32Array; colors: Float32Array; materials: Float32Array; indices: Uint32Array };

export function parseGlb(buffer: ArrayBuffer): SculptureModel {
  const view = new DataView(buffer);
  if (buffer.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) throw new Error("The sculpture is not a GLB file.");
  if (view.getUint32(4, true) !== 2) throw new Error("Only glTF 2.0 sculptures are supported.");

  const length = Math.min(view.getUint32(8, true), buffer.byteLength);
  let json: GltfJson | null = null;
  let bin: ArrayBuffer | null = null;
  for (let offset = 12; offset + 8 <= length;) {
    const chunkLength = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, start, chunkLength)));
    else if (type === CHUNK_BIN) bin = buffer.slice(start, start + chunkLength);
    offset = start + chunkLength;
  }
  if (!json || !bin) throw new Error("The sculpture is missing its glTF data.");

  const gltf = json;
  const binary = bin;
  const primitives: Primitive[] = [];

  function visit(nodeIndex: number, parent: Mat4) {
    const node = gltf.nodes?.[nodeIndex];
    if (!node) return;
    const local = node.matrix
      ? new Float32Array(node.matrix)
      : fromTranslationRotationScale(node.translation ?? [0, 0, 0], node.rotation ?? [0, 0, 0, 1], node.scale ?? [1, 1, 1]);
    const world = multiply(parent, local);
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes?.[node.mesh]?.primitives ?? []) {
        if ((primitive.mode ?? TRIANGLES) !== TRIANGLES) continue;
        primitives.push(readPrimitive(gltf, binary, primitive, world));
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }

  const roots = gltf.scenes?.[gltf.scene ?? 0]?.nodes ?? (gltf.nodes ?? []).map((_, index) => index);
  for (const root of roots) visit(root, identity());
  if (!primitives.length) throw new Error("The sculpture has no triangles.");

  return normalize(merge(primitives));
}

function readPrimitive(gltf: GltfJson, bin: ArrayBuffer, primitive: GltfPrimitive, world: Mat4): Primitive {
  const positionAccessor = primitive.attributes.POSITION;
  if (positionAccessor === undefined) throw new Error("A sculpture mesh has no positions.");
  const positions = readFloats(gltf, bin, positionAccessor);
  const count = positions.length / 3;
  const normalAccessor = primitive.attributes.NORMAL;
  const normals = normalAccessor === undefined ? fillVec3(count, [0, 0, 1]) : readFloats(gltf, bin, normalAccessor);
  const indices = primitive.indices === undefined
    ? Uint32Array.from({ length: count }, (_, index) => index)
    : readIndices(gltf, bin, primitive.indices);

  const material = gltf.materials?.[primitive.material ?? -1]?.pbrMetallicRoughness;
  const [r = 1, g = 1, b = 1] = material?.baseColorFactor ?? [];
  const metallic = material?.metallicFactor ?? 1;
  const roughness = material?.roughnessFactor ?? 1;

  const normalTransform = normalMatrix(world);
  const worldPositions = new Float32Array(count * 3);
  const worldNormals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const materials = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const [x, y, z] = transformPoint(world, positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    worldPositions.set([x, y, z], i * 3);
    const [nx, ny, nz] = transformPoint(normalTransform, normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
    const length = Math.hypot(nx, ny, nz) || 1;
    worldNormals.set([nx / length, ny / length, nz / length], i * 3);
    colors.set([r, g, b], i * 3);
    materials.set([metallic, roughness], i * 2);
  }
  return { positions: worldPositions, normals: worldNormals, colors, materials, indices };
}

function merge(primitives: Primitive[]): SculptureModel {
  const vertexCount = primitives.reduce((sum, primitive) => sum + primitive.positions.length / 3, 0);
  const indexCount = primitives.reduce((sum, primitive) => sum + primitive.indices.length, 0);
  const vertices = new Float32Array(vertexCount * SCULPTURE_STRIDE);
  const indices = new Uint32Array(indexCount);
  let vertexOffset = 0, indexOffset = 0;
  for (const primitive of primitives) {
    const count = primitive.positions.length / 3;
    for (let i = 0; i < count; i++) {
      const target = (vertexOffset + i) * SCULPTURE_STRIDE;
      vertices.set(primitive.positions.subarray(i * 3, i * 3 + 3), target);
      vertices.set(primitive.normals.subarray(i * 3, i * 3 + 3), target + 3);
      vertices.set(primitive.colors.subarray(i * 3, i * 3 + 3), target + 6);
      vertices.set(primitive.materials.subarray(i * 2, i * 2 + 2), target + 9);
    }
    for (let i = 0; i < primitive.indices.length; i++) indices[indexOffset + i] = primitive.indices[i] + vertexOffset;
    vertexOffset += count;
    indexOffset += primitive.indices.length;
  }
  return { vertices, indices };
}

// Centers the sculpture and scales it so its bounding sphere has radius one.
// The renderer can then use one camera framing for every composition.
function normalize(model: SculptureModel): SculptureModel {
  const { vertices } = model;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < vertices.length; i += SCULPTURE_STRIDE) {
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], vertices[i + axis]);
      max[axis] = Math.max(max[axis], vertices[i + axis]);
    }
  }
  const center = min.map((value, axis) => (value + max[axis]) / 2);
  let radius = 0;
  for (let i = 0; i < vertices.length; i += SCULPTURE_STRIDE) {
    radius = Math.max(radius, Math.hypot(vertices[i] - center[0], vertices[i + 1] - center[1], vertices[i + 2] - center[2]));
  }
  const scale = radius > 0 ? 1 / radius : 1;
  for (let i = 0; i < vertices.length; i += SCULPTURE_STRIDE) {
    vertices[i] = (vertices[i] - center[0]) * scale;
    vertices[i + 1] = (vertices[i + 1] - center[1]) * scale;
    vertices[i + 2] = (vertices[i + 2] - center[2]) * scale;
  }
  return model;
}

function fillVec3(count: number, value: [number, number, number]): Float32Array {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) out.set(value, i * 3);
  return out;
}

function accessorLayout(gltf: GltfJson, index: number) {
  const accessor = gltf.accessors[index];
  const view = accessor.bufferView === undefined ? undefined : gltf.bufferViews[accessor.bufferView];
  if (!view) throw new Error("A sculpture accessor has no buffer view.");
  const components = COMPONENT_COUNT[accessor.type];
  if (!components) throw new Error(`Unsupported accessor type ${accessor.type}.`);
  return {
    accessor,
    components,
    base: (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0),
    stride: view.byteStride ?? 0,
  };
}

function readFloats(gltf: GltfJson, bin: ArrayBuffer, index: number): Float32Array {
  const { accessor, components, base, stride } = accessorLayout(gltf, index);
  if (accessor.componentType !== FLOAT) throw new Error("Sculpture attributes must be 32-bit floats.");
  const step = stride || components * 4;
  const data = new DataView(bin);
  const out = new Float32Array(accessor.count * components);
  for (let i = 0; i < accessor.count; i++) {
    for (let c = 0; c < components; c++) out[i * components + c] = data.getFloat32(base + i * step + c * 4, true);
  }
  return out;
}

function readIndices(gltf: GltfJson, bin: ArrayBuffer, index: number): Uint32Array {
  const { accessor, base, stride } = accessorLayout(gltf, index);
  const size = accessor.componentType === 5121 ? 1 : accessor.componentType === 5123 ? 2 : 4;
  const step = stride || size;
  const data = new DataView(bin);
  const out = new Uint32Array(accessor.count);
  for (let i = 0; i < accessor.count; i++) {
    const at = base + i * step;
    out[i] = size === 1 ? data.getUint8(at) : size === 2 ? data.getUint16(at, true) : data.getUint32(at, true);
  }
  return out;
}
