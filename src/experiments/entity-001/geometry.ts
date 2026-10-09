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

// A swept, elongated carapace: crown, temples and a tapered jaw around an
// almond-shaped aperture. The normal is taken from the ellipsoid, not its radius.
export function createShell(count: number, radius: number, aperture: number, seed = 7): ShardSlot[] {
  const random = createRandom(seed);
  const candidates = Math.ceil(count * 1.3) + 12;
  const slots: ShardSlot[] = [];
  const eyeWidth = Math.sin(aperture) * 1.68;
  const eyeHeight = Math.sin(aperture) * 0.59;
  for (let i = 0; i < candidates; i++) {
    const y = 1 - (2 * (i + 0.5)) / candidates;
    const ring = Math.sqrt(1 - y * y);
    const theta = i * GOLDEN_ANGLE;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;
    const eye = (x / eyeWidth) ** 2 + ((y - 0.055) / eyeHeight) ** 2;
    if (z > 0.48 && eye < 1) continue;

    const jaw = y < -0.15 ? 1 - Math.pow((-y - 0.15) / 0.85, 1.3) * 0.4 : 1;
    const crown = 1 + Math.max(0, y) * 0.09;
    const ridge = 1 + Math.sin(y * Math.PI * 9) * 0.023;
    const swell = ridge * (1 + (random() - 0.5) * 0.022);
    const position = new Vector3(x * 0.91 * jaw * crown, y * 1.27, z * 0.76).multiplyScalar(radius * swell);
    const normal = new Vector3(x / 0.91, y / 1.27, z / 0.76).normalize();
    // Swept temple plates follow a shared current instead of random rotations.
    const sweep = Math.sin(theta) * 0.32 + y * 0.65;
    const tangent = tangentFor(normal, sweep);
    const brow = z > 0.48 && eye < 2 ? 1.2 : 1;
    slots.push({
      position,
      orientation: basisQuaternion(tangent, normal),
      size: (0.12 + 0.16 * Math.pow(random(), 1.6)) * brow,
      seed: random(),
    });
  }
  return Array.from({ length: count }, (_, i) => slots[Math.floor((i * slots.length) / count)]);
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
