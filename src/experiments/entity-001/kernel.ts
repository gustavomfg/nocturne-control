import {
  AdditiveBlending, CatmullRomCurve3, Color, Group, Mesh, MeshBasicMaterial,
  MeshPhysicalMaterial, ShaderMaterial, SphereGeometry, TorusGeometry, TubeGeometry, Vector3,
} from "three";
import { clamp, lerp } from "../../core/math";
import { ENTITY } from "./config";

const vertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  vLocal = normalize(position);
  gl_Position = projectionMatrix * mv;
}
`;
const fragment = /* glsl */ `
uniform vec3 uEmber, uFrost;
uniform float uLight, uWarmth, uTime, uAgitation;
varying vec3 vNormal, vView, vLocal;
void main() {
  float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
  float radius = sqrt(max(0.0, 1.0 - facing * facing));
  float angle = atan(vLocal.y, vLocal.x);
  float fibers = pow(0.5 + 0.5 * sin(angle * 76.0 + sin(radius * 31.0 - uTime * 0.5) * 2.5), 3.0);
  float iris = smoothstep(0.27, 0.48, radius) * (1.0 - smoothstep(0.86, 1.0, radius));
  float orbit = exp(-pow((radius - 0.74) * 24.0, 2.0));
  float pulse = 0.9 + 0.1 * sin(uTime * 0.8 + radius * 12.0);
  vec3 tone = mix(uFrost, uEmber, uWarmth);
  vec3 color = vec3(0.006, 0.01, 0.014);
  color += tone * iris * (0.28 + fibers * 0.55 + orbit * 0.55) * pulse * uLight;
  color += tone * pow(1.0 - facing, 5.0) * 0.28 * uLight;
  color *= 1.0 + uAgitation * sin(uTime * 17.0) * 0.07;
  gl_FragColor = vec4(color, 1.0);
}
`;
const haloFragment = /* glsl */ `
uniform vec3 uEmber, uFrost;
uniform float uLight, uWarmth;
varying vec3 vNormal, vView, vLocal;
void main() {
  float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 4.0);
  float alpha = rim * 0.065 * uLight;
  gl_FragColor = vec4(mix(uFrost, uEmber, uWarmth) * alpha, alpha);
}
`;

export type KernelState = {
  light: number; warmth: number; elapsed: number; openness?: number;
  agitation?: number; gazeX?: number; gazeY?: number; dive?: number; evolution?: number;
};

export class Kernel {
  readonly group = new Group();
  private readonly lens = new Group();
  private readonly iris: Mesh;
  private readonly lower: Mesh;
  private readonly upper: Mesh;
  private readonly pupil: Mesh;
  private readonly irisMaterial: MeshBasicMaterial;
  private readonly platesMaterial: MeshPhysicalMaterial;
  private readonly materials: (ShaderMaterial | MeshBasicMaterial | MeshPhysicalMaterial)[];
  private readonly geometries: (SphereGeometry | TorusGeometry | TubeGeometry)[];
  private readonly color = new Color();
  private readonly ember = new Color(ENTITY.palette.ember);
  private readonly frost = new Color(ENTITY.palette.frost);
  private readonly uniforms = {
    uEmber: { value: this.ember }, uFrost: { value: this.frost },
    uLight: { value: 0 }, uWarmth: { value: 1 }, uTime: { value: 0 }, uAgitation: { value: 0 },
  };

  constructor(radius: number) {
    const coreGeometry = new SphereGeometry(0.62, 48, 32);
    const coreMaterial = new ShaderMaterial({ uniforms: this.uniforms, vertexShader: vertex, fragmentShader: fragment });
    const core = new Mesh(coreGeometry, coreMaterial);
    core.scale.set(1.13, 0.53, 0.6);
    this.lens.add(core);

    const haloGeometry = new SphereGeometry(0.79, 32, 20);
    const haloMaterial = new ShaderMaterial({
      uniforms: this.uniforms, vertexShader: vertex, fragmentShader: haloFragment,
      transparent: true, depthWrite: false, blending: AdditiveBlending,
    });
    const halo = new Mesh(haloGeometry, haloMaterial);
    halo.scale.set(1.16, 0.6, 0.66);
    this.lens.add(halo);

    const irisGeometry = new TorusGeometry(0.64, 0.012, 8, 128);
    this.irisMaterial = new MeshBasicMaterial({
      color: ENTITY.palette.ember, transparent: true, opacity: 0,
      depthWrite: false, blending: AdditiveBlending,
    });
    this.iris = new Mesh(irisGeometry, this.irisMaterial);
    this.iris.scale.set(1.12, 0.54, 1);
    this.iris.position.z = 0.12;
    this.lens.add(this.iris);

    const pupilGeometry = new SphereGeometry(0.2, 32, 20);
    const pupilMaterial = new MeshPhysicalMaterial({ color: "#060b0e", metalness: 0.4, roughness: 0.2 });
    this.pupil = new Mesh(pupilGeometry, pupilMaterial);
    this.pupil.scale.set(1, 0.72, 0.3);
    this.pupil.position.z = 0.34;
    this.lens.add(this.pupil);

    // Solid brows anchor the fragmented anatomy. Their front edge reads in
    // silhouette even before the carapace has materialized.
    this.platesMaterial = new MeshPhysicalMaterial({
      color: ENTITY.palette.graphite, metalness: 0.9, roughness: 0.25,
      clearcoat: 0.18, envMapIntensity: 1.1,
    });
    const arc = (sign: number) => {
      const points = Array.from({ length: 49 }, (_, i) => {
        const a = (i / 48) * Math.PI;
        return new Vector3(Math.cos(a) * radius * 0.52,
          Math.sin(a) * radius * 0.16 * sign, -Math.sin(a) * 0.07);
      });
      return new TubeGeometry(new CatmullRomCurve3(points), 64, 0.047, 8, false);
    };
    const upperGeometry = arc(1);
    const lowerGeometry = arc(-1);
    this.upper = new Mesh(upperGeometry, this.platesMaterial);
    this.lower = new Mesh(lowerGeometry, this.platesMaterial);
    this.group.add(this.lens, this.upper, this.lower);
    this.materials = [coreMaterial, haloMaterial, this.irisMaterial, pupilMaterial, this.platesMaterial];
    this.geometries = [coreGeometry, haloGeometry, irisGeometry, pupilGeometry, upperGeometry, lowerGeometry];
  }

  update(state: KernelState) {
    const openness = clamp(state.openness ?? 1, 0.05, 1);
    const dive = state.dive ?? 0;
    this.uniforms.uLight.value = Math.min(1.65, state.light * 1.25);
    this.uniforms.uWarmth.value = state.warmth;
    this.uniforms.uTime.value = state.elapsed;
    this.uniforms.uAgitation.value = state.agitation ?? 0;
    this.color.copy(this.frost).lerp(this.ember, state.warmth);
    this.irisMaterial.color.copy(this.color);
    this.irisMaterial.opacity = state.light * 0.35;
    this.lens.position.set(0, ENTITY.eye.y, lerp(ENTITY.eye.z, 0, dive));
    this.lens.scale.y = lerp(0.1, 1, openness);
    this.iris.rotation.z = Math.sin(state.elapsed * 0.12) * 0.03;
    this.pupil.position.x = (state.gazeX ?? 0) * 0.07;
    this.pupil.position.y = (state.gazeY ?? 0) * 0.035;
    for (const [plate, sign] of [[this.upper, 1], [this.lower, -1]] as const) {
      plate.position.set(0, ENTITY.eye.y + sign * (1 - openness) * -0.23, ENTITY.eye.z + 0.13);
      plate.scale.y = lerp(0.35, 1, openness);
      plate.visible = dive < 0.7;
    }
    this.platesMaterial.emissive.copy(this.color);
    this.platesMaterial.emissiveIntensity = state.light * 0.025;
  }

  dispose() {
    this.geometries.forEach((geometry) => geometry.dispose());
    this.materials.forEach((material) => material.dispose());
  }
}
