import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector3 } from "three";
import { createRandom } from "../../core/math";
import { GLSL_WOBBLE } from "../../core/noise";
import { ENTITY } from "./config";

// Fine dust in a shell around the entity. Each mote drifts on its own orbit in
// the vertex shader, so the cloud costs almost nothing on the CPU.
const vertex = /* glsl */ `
${GLSL_WOBBLE}
uniform float uTime;
uniform float uPixelRatio;
uniform float uEnergy;
attribute float aSeed;
varying float vAlpha;
void main() {
  vec3 p = position;
  float turn = uTime * (0.03 + aSeed * 0.05) * (aSeed > 0.5 ? 1.0 : -1.0);
  p.xz = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * p.xz;
  p += vec3(
    wobble(p * 0.6, uTime * 0.4 + aSeed * 9.0),
    wobble(p * 0.7 + 3.1, uTime * 0.3 + aSeed * 5.0),
    wobble(p * 0.5 + 7.3, uTime * 0.35 + aSeed * 13.0)
  ) * 0.08;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uPixelRatio * (1.0 + aSeed * 1.8 + uEnergy * 1.2) * (9.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
  vAlpha = (0.25 + 0.75 * aSeed) * (0.8 + uEnergy * 0.6);
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float alpha = smoothstep(1.0, 0.0, d) * vAlpha * uOpacity;
  if (alpha < 0.002) discard;
  gl_FragColor = vec4(uColor * alpha, alpha);
}
`;

export class Dust {
  readonly points: Points;
  private readonly geometry: BufferGeometry;
  private readonly material: ShaderMaterial;

  constructor(count: number, inner: number, outer: number, pixelRatio: number, seed = 19) {
    const random = createRandom(seed);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const direction = new Vector3();

    for (let i = 0; i < count; i++) {
      // Uniform inside a shell: cube-root keeps the density even with radius.
      const u = random() * 2 - 1;
      const theta = random() * Math.PI * 2;
      const ring = Math.sqrt(1 - u * u);
      direction.set(ring * Math.cos(theta), u, ring * Math.sin(theta));
      const distance = inner + (outer - inner) * Math.cbrt(random());
      positions.set([direction.x * distance, direction.y * distance, direction.z * distance], i * 3);
      seeds[i] = random();
    }

    this.geometry = new BufferGeometry();
    this.geometry.setAttribute("position", new BufferAttribute(positions, 3));
    this.geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: pixelRatio },
        uEnergy: { value: 0 },
        uColor: { value: new Color(ENTITY.palette.ivory) },
        uOpacity: { value: 0.9 },
      },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.points = new Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  update(elapsed: number, energy: number, light: number) {
    this.material.uniforms.uTime.value = elapsed;
    this.material.uniforms.uEnergy.value = energy;
    this.material.uniforms.uOpacity.value = 0.25 + light * 0.45;
  }

  setPixelRatio(value: number) {
    this.material.uniforms.uPixelRatio.value = value;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
