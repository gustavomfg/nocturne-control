import { Matrix4, Quaternion, Vector3 } from "three";
import { createRandom } from "../../core/math";

// One slot in a formation. `orientation` already aligns the shard's thin axis
// with the formation's surface, so the renderer only needs position and rotation.
export type ShardSlot = {
  position: Vector3;
  orientation: Quaternion;
  size: number;
  seed: number;
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export function basisQuaternion(x: Vector3, y: Vector3): Quaternion {
  // Re-orthogonalize: the inputs may be only approximately perpendicular.
  const z = new Vector3().crossVectors(x, y).normalize();
  const yAxis = new Vector3().crossVectors(z, x).normalize();
  const matrix = new Matrix4().makeBasis(x.clone().normalize(), yAxis, z);
  return new Quaternion().setFromRotationMatrix(matrix);
}

// Any unit vector perpendicular to `direction`, turned by `angle` about it.
function tangentFor(direction: Vector3, angle: number) {
  const reference = Math.abs(direction.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
  const base = new Vector3().crossVectors(reference, direction).normalize();
  const second = new Vector3().crossVectors(direction, base);
  return base.multiplyScalar(Math.cos(angle)).addScaledVector(second, Math.sin(angle));
}

// Fibonacci lattice on a sphere, with a radius that varies gently so the shell
// reads as assembled rather than printed. A cap facing +Z is left open: that is the
// aperture the visitor sees, and the luminous core shows through it.
export function createShell(count: number, radius: number, aperture: number, seed = 7): ShardSlot[] {
  const random = createRandom(seed);
  const capArea = (1 - Math.cos(aperture)) / 2;
  // A small margin covers rounding, so the aperture never leaves the shell short.
  const candidates = Math.ceil((count / (1 - capArea)) * 1.02) + 4;
  const rimCos = Math.cos(aperture + 0.22);
  const apertureCos = Math.cos(aperture);
  const slots: ShardSlot[] = [];

  for (let i = 0; i < candidates && slots.length < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / candidates;
    const ring = Math.sqrt(1 - y * y);
    const theta = i * GOLDEN_ANGLE;
    const direction = new Vector3(Math.cos(theta) * ring, y, Math.sin(theta) * ring);
    if (direction.z > apertureCos) continue;

    const swell = 1 + 0.05 * Math.sin(3 * theta + y * 4) + (random() - 0.5) * 0.04;
    const position = direction.clone().multiplyScalar(radius * swell);
    const tangent = tangentFor(direction, random() * Math.PI * 2);
    // The rim of the aperture is framed by slightly larger shards.
    const rim = direction.z > rimCos ? 1.35 : 1;
    slots.push({
      position,
      orientation: basisQuaternion(tangent, direction),
      size: (0.07 + 0.15 * Math.pow(random(), 2.4)) * rim,
      seed: random(),
    });
  }
  return slots;
}

// Three orbital rings. Shards lie along each ring, with their thin axis pointing
// radially, so the sphere can unfold into them without a cut.
export function createRings(count: number, radius: number, seed = 11): ShardSlot[] {
  const random = createRandom(seed);
  const normals = [
    new Vector3(0, 0, 1),
    new Vector3(0, 0.82, 0.57).normalize(),
    new Vector3(0.78, 0, 0.62).normalize(),
  ];
  const perRing = Math.ceil(count / normals.length);
  const slots: ShardSlot[] = [];

  normals.forEach((normal, ringIndex) => {
    const u = tangentFor(normal, 0);
    const v = new Vector3().crossVectors(normal, u);
    for (let i = 0; i < perRing && slots.length < count; i++) {
      const angle = ((i + random() * 0.6) / perRing) * Math.PI * 2;
      const radial = new Vector3().addScaledVector(u, Math.cos(angle)).addScaledVector(v, Math.sin(angle));
      const tangent = new Vector3().addScaledVector(u, -Math.sin(angle)).addScaledVector(v, Math.cos(angle));
      const ringRadius = radius * (1.12 + (random() - 0.5) * 0.06) + (ringIndex === 1 ? 0.04 : 0);
      slots.push({
        position: radial.clone().multiplyScalar(ringRadius),
        orientation: basisQuaternion(tangent, radial),
        size: 0.06 + 0.12 * Math.pow(random(), 2),
        seed: random(),
      });
    }
  });
  return slots;
}
