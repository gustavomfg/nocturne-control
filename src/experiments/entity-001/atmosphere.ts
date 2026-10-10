import {
  AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, PlaneGeometry,
  ShaderMaterial, TorusGeometry, type Camera,
} from "three";
import { ENTITY } from "./config";

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const fragment = /* glsl */ `
varying vec2 vUv;
uniform float uTime, uPresence, uEnergy;
void main() {
  vec2 p = (vUv - 0.5) * vec2(1.65, 1.0);
  float haze = exp(-dot(p * vec2(1.2, 2.0), p * vec2(1.2, 2.0)) * 7.0);
  float shaft = exp(-pow((p.x + p.y * 0.47 + 0.23) * 12.0, 2.0));
  float counter = exp(-pow((p.x - p.y * 0.2 - 0.3) * 19.0, 2.0));
  float filaments = 0.6 + 0.4 * sin(p.y * 28.0 + sin(p.x * 17.0 + uTime * 0.045));
  vec3 color = vec3(0.025, 0.045, 0.055) * haze;
  color += vec3(0.07, 0.11, 0.13) * shaft * haze * filaments * 0.38;
  color += vec3(0.12, 0.07, 0.035) * counter * haze * 0.22;
  gl_FragColor = vec4(color * uPresence * (0.65 + uEnergy * 0.35), 1.0);
}
`;

export class Atmosphere {
  readonly group = new Group();
  private readonly geometry = new PlaneGeometry(38, 24);
  private readonly material = new ShaderMaterial({
    vertexShader: vertex, fragmentShader: fragment, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uPresence: { value: 0 }, uEnergy: { value: 0 } },
  });
  private readonly backdrop = new Mesh(this.geometry, this.material);
  private readonly ringGeometry = new TorusGeometry(2.55, 0.009, 6, 160);
  private readonly ringMaterial = new MeshBasicMaterial({
    color: new Color(ENTITY.palette.frost).multiplyScalar(1.5),
    transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending,
  });
  private readonly rings: Mesh[] = [];

  constructor() {
    this.backdrop.renderOrder = -5;
    this.group.add(this.backdrop);
    for (let i = 0; i < 3; i++) {
      const ring = new Mesh(this.ringGeometry, this.ringMaterial);
      ring.rotation.set(i * 0.72, i * -0.6, i * 0.35);
      ring.scale.setScalar(1 + i * 0.16);
      this.rings.push(ring);
      this.group.add(ring);
    }
  }
  update(camera: Camera, time: number, presence: number, energy: number, resonance: number, reduced: boolean, orbitalVisibility = 1) {
    this.backdrop.quaternion.copy(camera.quaternion);
    this.backdrop.position.copy(camera.position).normalize().multiplyScalar(-14);
    this.material.uniforms.uTime.value = reduced ? 0 : time;
    this.material.uniforms.uPresence.value = presence;
    this.material.uniforms.uEnergy.value = energy;
    this.ringMaterial.opacity = (0.055 + resonance * 0.035) * orbitalVisibility;
    this.rings.forEach((ring, i) => {
      ring.rotation.z = i * 0.35 + (reduced ? 0 : Math.sin(time * 0.07 + i) * 0.08);
    });
  }
  dispose() {
    this.geometry.dispose(); this.material.dispose();
    this.ringGeometry.dispose(); this.ringMaterial.dispose();
  }
}
