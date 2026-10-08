import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  RingGeometry,
  ShaderMaterial,
  SphereGeometry,
} from "three";
import { ENTITY } from "./config";

// The luminous heart of the entity, seen through the open face of the shell.
// It is a glowing core with a fresnel halo and a thin iris around the aperture.
const coreVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`;

const coreFragment = /* glsl */ `
uniform vec3 uEmber;
uniform vec3 uFrost;
uniform vec3 uIvory;
uniform float uLight;
uniform float uWarmth;
uniform float uTime;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
  float rim = pow(1.0 - facing, 2.2);
  float pulse = 0.82 + 0.18 * sin(uTime * 1.7 + vNormal.x * 5.0 + vNormal.y * 4.0);
  vec3 tone = mix(uFrost, uEmber, uWarmth);
  // Ember at the edges, a hot ivory center: the eye is brightest where it looks back at you.
  vec3 color = tone * (0.45 + 0.55 * facing) * pulse * uLight;
  color += uIvory * pow(facing, 12.0) * 0.55 * uLight;
  color += tone * rim * 0.6 * uLight;
  gl_FragColor = vec4(color, 1.0);
}
`;

const haloFragment = /* glsl */ `
uniform vec3 uEmber;
uniform vec3 uFrost;
uniform float uLight;
uniform float uWarmth;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
  float alpha = pow(1.0 - facing, 3.0) * 0.35 * uLight;
  gl_FragColor = vec4(mix(uFrost, uEmber, uWarmth) * alpha, alpha);
}
`;

export type KernelState = {
  // 0 dark, 1 fully lit.
  light: number;
  // 0 frost, 1 ember.
  warmth: number;
  elapsed: number;
};

export class Kernel {
  readonly group = new Group();
  private readonly core: Mesh;
  private readonly halo: Mesh;
  private readonly iris: Mesh;
  private readonly materials: (ShaderMaterial | MeshBasicMaterial)[];
  private readonly geometries: (SphereGeometry | RingGeometry)[];
  private readonly coreMaterial: ShaderMaterial;
  private readonly haloMaterial: ShaderMaterial;
  private readonly irisMaterial: MeshBasicMaterial;
  private readonly ember = new Color(ENTITY.palette.ember);
  private readonly frost = new Color(ENTITY.palette.frost);
  private readonly ivory = new Color(ENTITY.palette.ivory);
  private readonly uniforms = {
    uEmber: { value: this.ember },
    uFrost: { value: this.frost },
    uIvory: { value: this.ivory },
    uLight: { value: 0 },
    uWarmth: { value: 0.6 },
    uTime: { value: 0 },
  };

  constructor(radius: number) {
    const coreGeometry = new SphereGeometry(0.4, 48, 32);
    this.coreMaterial = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: coreVertex, fragmentShader: coreFragment });
    this.core = new Mesh(coreGeometry, this.coreMaterial);

    const haloGeometry = new SphereGeometry(1.05, 40, 24);
    this.haloMaterial = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: coreVertex,
      fragmentShader: haloFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.halo = new Mesh(haloGeometry, this.haloMaterial);

    // The iris sits on the shell's plane, just inside the aperture.
    const apertureRadius = radius * Math.sin(ENTITY.aperture);
    const irisGeometry = new RingGeometry(apertureRadius * 0.99, apertureRadius * 1.02, 128);
    this.irisMaterial = new MeshBasicMaterial({
      color: ENTITY.palette.ember,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.iris = new Mesh(irisGeometry, this.irisMaterial);
    this.iris.position.set(0, 0, radius * Math.cos(ENTITY.aperture));

    this.group.add(this.core, this.halo, this.iris);

    this.materials = [this.coreMaterial, this.haloMaterial, this.irisMaterial];
    this.geometries = [coreGeometry, haloGeometry, irisGeometry];
  }

  update(state: KernelState) {
    const { light, warmth, elapsed } = state;
    // The core is driven past 1 so that bloom turns it into a glow; the iris stays subtle.
    this.uniforms.uLight.value = light * 1.75;
    this.uniforms.uWarmth.value = warmth;
    this.uniforms.uTime.value = elapsed;
    this.irisMaterial.opacity = 0.05 + light * 0.3;
    // Past full light the iris whitens, which is how the flash of a recoil reads.
    this.irisMaterial.color.copy(this.ember).lerp(this.ivory, Math.max(0, light - 1) * 0.5);
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}
