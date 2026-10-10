import {
  Color, InstancedBufferAttribute, InstancedMesh, Matrix4, MeshStandardMaterial,
  OctahedronGeometry, Vector3,
} from "three";
import { clamp, createRandom, smoothstep } from "../../core/math";
import { ENTITY } from "./config";
import type { ShardSlot } from "./geometry";

export type SwarmInput = {
  dt: number; reveal: number; motion: number; glow: number;
  breath?: number; opening?: number; scan?: number; trace?: number;
};

// This is only the assembled procedural fallback. Its facets never have cursor
// forces, free velocities or targets in a separate particle formation.
export class ShardSwarm {
  readonly mesh: InstancedMesh;
  private readonly slots: ShardSlot[];
  private readonly revealHeight: number;
  private readonly heat: InstancedBufferAttribute;
  private readonly geometry = new OctahedronGeometry(1, 0);
  private readonly material: MeshStandardMaterial;
  private readonly matrix = new Matrix4();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly normal = new Vector3();

  constructor(slots: ShardSlot[], radius: number, seed = 3) {
    this.slots = slots; this.revealHeight = radius * 1.27;
    const random = createRandom(seed);
    this.geometry.scale(1, 0.14, 0.78);
    this.heat = new InstancedBufferAttribute(new Float32Array(slots.length), 1);
    this.geometry.setAttribute("aHeat", this.heat);
    this.material = new MeshStandardMaterial({
      color: 0xffffff, metalness: 0.92, roughness: 0.36, envMapIntensity: 0.9, flatShading: true,
    });
    this.material.onBeforeCompile = shader => {
      shader.uniforms.uEmber = { value: new Color(ENTITY.palette.ember) };
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nattribute float aHeat;\nvarying float vHeat;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHeat = aHeat;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vHeat;\nuniform vec3 uEmber;")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEmber * vHeat * 0.5;");
    };
    this.material.customProgramCacheKey = () => "ovra-assembled-carapace";
    this.mesh = new InstancedMesh(this.geometry, this.material, slots.length);
    this.mesh.frustumCulled = false;
    const color = new Color(ENTITY.palette.graphite);
    slots.forEach((_, i) => this.mesh.setColorAt(i, color.clone().offsetHSL(0, 0, (random() - 0.5) * 0.03)));
  }
  update(input: SwarmInput) {
    this.slots.forEach((slot, i) => {
      const threshold = 0.05 + 0.65 * clamp((slot.position.y + this.revealHeight) / (2 * this.revealHeight)) + slot.seed * 0.25;
      const reveal = Math.max(smoothstep(threshold - 0.12, threshold, input.reveal),
        (input.trace ?? 0) * 0.48 * (1 - input.reveal * 0.6));
      const expansion = ((input.opening ?? 0) * 0.08 + (input.breath ?? 0) * 0.008) * input.motion;
      this.normal.copy(slot.position).normalize();
      this.position.copy(slot.position).addScaledVector(this.normal, expansion);
      this.scale.setScalar(slot.size * reveal);
      this.matrix.compose(this.position, slot.orientation, this.scale);
      this.mesh.setMatrixAt(i, this.matrix);
      const scan = Math.exp(-Math.pow((slot.position.y / this.revealHeight - (input.scan ?? 2)) * 9, 2));
      const target = input.glow * 0.006 + scan * 0.12;
      this.heat.setX(i, this.heat.getX(i) + (target - this.heat.getX(i)) * (1 - Math.exp(-input.dt * 4)));
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.heat.needsUpdate = true;
  }
  dispose() { this.geometry.dispose(); this.material.dispose(); this.mesh.dispose(); }
}
