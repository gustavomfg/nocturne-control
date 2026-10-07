// Column-major 4×4 matrices, the layout WebGL and glTF both use.
export type Mat4 = Float32Array;

export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = m[5] = m[10] = m[15] = 1;
  return m;
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + row] * b[column * 4 + k];
      out[column * 4 + row] = sum;
    }
  }
  return out;
}

export function translation(x: number, y: number, z: number): Mat4 {
  const m = identity();
  m[12] = x; m[13] = y; m[14] = z;
  return m;
}

export function scaling(s: number): Mat4 {
  const m = identity();
  m[0] = m[5] = m[10] = s;
  return m;
}

export function rotationX(angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const m = identity();
  m[5] = c; m[6] = s; m[9] = -s; m[10] = c;
  return m;
}

export function rotationY(angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const m = identity();
  m[0] = c; m[2] = -s; m[8] = s; m[10] = c;
  return m;
}

export function perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovY / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}

// glTF stores node transforms as translation, quaternion [x, y, z, w] and scale.
export function fromTranslationRotationScale(
  t: readonly number[],
  q: readonly number[],
  s: readonly number[],
): Mat4 {
  const [x, y, z, w] = q;
  const xx = x * x, yy = y * y, zz = z * z;
  const xy = x * y, xz = x * z, yz = y * z;
  const wx = w * x, wy = w * y, wz = w * z;
  const m = new Float32Array(16);
  m[0] = (1 - 2 * (yy + zz)) * s[0];
  m[1] = 2 * (xy + wz) * s[0];
  m[2] = 2 * (xz - wy) * s[0];
  m[4] = 2 * (xy - wz) * s[1];
  m[5] = (1 - 2 * (xx + zz)) * s[1];
  m[6] = 2 * (yz + wx) * s[1];
  m[8] = 2 * (xz + wy) * s[2];
  m[9] = 2 * (yz - wx) * s[2];
  m[10] = (1 - 2 * (xx + yy)) * s[2];
  m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; m[15] = 1;
  return m;
}

export function transformPoint(m: Mat4, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[4] * y + m[8] * z + m[12],
    m[1] * x + m[5] * y + m[9] * z + m[13],
    m[2] * x + m[6] * y + m[10] * z + m[14],
  ];
}

// Normals follow the inverse transpose of the upper 3×3 so they stay
// perpendicular to the surface even when a node is scaled unevenly.
export function normalMatrix(m: Mat4): Mat4 {
  const a = m[0], b = m[4], c = m[8];
  const d = m[1], e = m[5], f = m[9];
  const g = m[2], h = m[6], i = m[10];
  const c00 = e * i - f * h, c01 = f * g - d * i, c02 = d * h - e * g;
  const det = a * c00 + b * c01 + c * c02;
  const out = identity();
  if (Math.abs(det) < 1e-12) return out;
  const inv = 1 / det;
  // Row r of the inverse transpose is the r-th row of cofactors divided by the
  // determinant. Column-major storage puts element (row r, column c) at c * 4 + r.
  out[0] = c00 * inv; out[4] = c01 * inv; out[8] = c02 * inv;
  out[1] = (c * h - b * i) * inv; out[5] = (a * i - c * g) * inv; out[9] = (b * g - a * h) * inv;
  out[2] = (b * f - c * e) * inv; out[6] = (c * d - a * f) * inv; out[10] = (a * e - b * d) * inv;
  return out;
}
