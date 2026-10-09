import {
  Color,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  OctahedronGeometry,
  Quaternion,
  Vector3,
} from "three";
import { clamp, createRandom, smoothstep } from "../../core/math";
import { wobble } from "../../core/noise";
import { ENTITY } from "./config";
import type { ShardSlot } from "./geometry";

// Each shard is a small spring with its own stiffness. Pushes from the cursor
// displace it, and it returns at its own pace, so the surface reads as living
// matter rather than a single object being dragged.
type Shard = {
  home: Vector3;
  ring: Vector3;
  homeQuat: Quaternion;
  ringQuat: Quaternion;
  outward: Vector3;
  size: number;
  seed: number;
  // When this shard starts joining the morph, from 0 to 1. Gives the transformation a wave.
  delay: number;
  // Threshold of the intro reveal at which this shard materializes.
  reveal: number;
  stiffness: number;
  damping: number;
  offset: Vector3;
  velocity: Vector3;
  spin: Quaternion;
  spinRate: Vector3;
  heat: number;
};

export type SwarmInput = {
  dt: number;
  elapsed: number;
  // 0 shell, 1 rings.
  morph: number;
  // 0 assembled, 1 scattered outward.
  disperse: number;
  // 0 to 1 during the intro.
  reveal: number;
  // 0 under reduced motion: idle wobble and cursor pushes are switched off.
  motion: number;
  // Smoothed cursor in the entity's local space. Null when the visitor is absent.
  cursor: Vector3 | null;
  cursorSpeed: number;
  reactivity: number;
  // Baseline heat from the core, 0 to 1.
  glow: number;
  breath?: number;
  agitation?: number;
  spread?: number;
  evolution?: number;
  contraction?: number;
  scan?: number;
  trace?: number;
};

// Radius around the cursor where shards respond.
const REACH = 0.85;
const TAP_REACH = 1.7;
const MAX_VELOCITY = 4.5;

const SHARD_VERTEX_HEAT = /* glsl */ `
attribute float aHeat;
varying float vHeat;
`;

export class ShardSwarm {
  readonly mesh: InstancedMesh;
  private readonly shards: Shard[];
  private readonly heatAttribute: InstancedBufferAttribute;
  private readonly geometry: OctahedronGeometry;
  private readonly material: MeshStandardMaterial;
  private readonly uniforms = {
    uEmber: { value: new Color(ENTITY.palette.ember) },
    uIvory: { value: new Color(ENTITY.palette.ivory) },
    uGlow: { value: 0.9 },
  };
  private readonly matrix = new Matrix4();
  private readonly current = new Vector3();
  private readonly direction = new Vector3();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private readonly quaternion = new Quaternion();
  private readonly spinStep = new Quaternion();
  private readonly identity = new Quaternion();
  private readonly swirl = new Vector3();
  private readonly up = new Vector3(0, 1, 0);

  constructor(home: ShardSlot[], rings: ShardSlot[], radius: number, seed = 3) {
    const random = createRandom(seed);
    const count = home.length;

    // Octahedron stretched into a thin, faceted chip. Its local Y is the thin axis.
    this.geometry = new OctahedronGeometry(1, 0);
    this.geometry.scale(1, 0.14, 0.78);
    this.heatAttribute = new InstancedBufferAttribute(new Float32Array(count), 1);
    this.geometry.setAttribute("aHeat", this.heatAttribute);

    this.material = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.92,
      roughness: 0.32,
      envMapIntensity: 1.1,
      flatShading: true,
    });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${SHARD_VERTEX_HEAT}`)
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvHeat = aHeat;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vHeat;\nuniform vec3 uEmber;\nuniform vec3 uIvory;\nuniform float uGlow;")
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\nvec3 heatColor = mix(uEmber, uIvory, smoothstep(0.55, 1.0, vHeat));\ntotalEmissiveRadiance += heatColor * vHeat * uGlow;",
        );
    };
    this.material.customProgramCacheKey = () => "ovra-shard-heat";

    this.mesh = new InstancedMesh(this.geometry, this.material, count);
    this.mesh.frustumCulled = false;

    const graphite = new Color(ENTITY.palette.graphite);
    const tint = new Color();
    this.shards = home.map((slot, index) => {
      const ringSlot = rings[index];
      // Each shard gets a slight tonal difference, so the metal does not look stamped.
      tint.copy(graphite).offsetHSL((random() - 0.5) * 0.02, 0, (random() - 0.5) * 0.05);
      this.mesh.setColorAt(index, tint);

      // Stiffer shards come back sooner; softer ones linger longer.
      const stiffness = 5 + random() * 7;
      const reveal = 0.05 + 0.65 * clamp((slot.position.y + radius * 1.27) / (2.54 * radius)) + 0.25 * slot.seed;
      return {
        home: slot.position.clone(),
        ring: ringSlot.position.clone(),
        homeQuat: slot.orientation.clone(),
        ringQuat: ringSlot.orientation.clone(),
        outward: slot.position.clone().normalize(),
        size: slot.size,
        seed: slot.seed,
        delay: random(),
        reveal,
        stiffness,
        damping: 2 * Math.sqrt(stiffness) * 0.55,
        offset: new Vector3(),
        velocity: new Vector3(),
        spin: new Quaternion(),
        spinRate: new Vector3(),
        heat: 0,
      };
    });
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(input: SwarmInput) {
    const { dt, elapsed, motion, reactivity } = input;
    const cursor = input.cursor;
    const pushStrength = clamp(input.cursorSpeed, 0, 3) * reactivity * 6;

    this.shards.forEach((shard, index) => {
      const morph = smoothstep(0, 1, clamp((input.morph - shard.delay * 0.3) / 0.7));
      this.current.lerpVectors(shard.home, shard.ring, morph);
      const evolution = (input.evolution ?? 0) * (1 - morph);
      this.current.x *= 1 - evolution * 0.1;
      this.current.y *= 1 + evolution * 0.08;

      // Proximity to the cursor drives both the push and the heat. The push also
      // twists the shard, so it turns as it is displaced.
      let proximity = 0;
      if (cursor) {
        const distance = this.current.distanceTo(cursor);
        if (distance < REACH) {
          proximity = (1 - distance / REACH) ** 2;
          this.direction.subVectors(this.current, cursor).normalize();
          const impulse = pushStrength * proximity * dt;
          shard.velocity.addScaledVector(this.direction, impulse);
          this.swirl.crossVectors(this.direction, this.up).multiplyScalar(impulse * 0.8);
          shard.spinRate.add(this.swirl);
        }
      }

      // Damped spring toward the rest offset: a = -k·x - c·v, integrated per frame.
      shard.velocity.addScaledVector(shard.offset, -shard.stiffness * dt);
      shard.velocity.multiplyScalar(Math.exp(-shard.damping * dt));
      shard.velocity.clampLength(0, MAX_VELOCITY);
      shard.offset.addScaledVector(shard.velocity, dt);

      // Disperse and idle wobble move the shard along its outward direction.
      const agitation = input.agitation ?? 0;
      const idle = wobble(shard.home.x, shard.home.y, shard.home.z, elapsed * (0.3 + agitation) + shard.seed * 3) * (0.016 + agitation * 0.045) * motion;
      const respiration = (input.breath ?? 0) * 0.045 * motion;
      const outward = input.disperse * (1 - morph) * (1.8 + shard.seed * 2.6) + idle + respiration + (input.spread ?? 0) - (input.contraction ?? 0);
      this.position.copy(this.current).addScaledVector(shard.outward, outward).add(shard.offset);

      // Spin decays back to the resting orientation.
      if (shard.spinRate.lengthSq() > 1e-8) {
        const angle = shard.spinRate.length() * dt;
        this.spinStep.setFromAxisAngle(this.direction.copy(shard.spinRate).normalize(), angle);
        shard.spin.premultiply(this.spinStep);
        shard.spinRate.multiplyScalar(Math.exp(-dt * 1.4));
      }
      shard.spin.slerp(this.identity, 1 - Math.exp(-dt * 1.2));

      this.quaternion.slerpQuaternions(shard.homeQuat, shard.ringQuat, morph).multiply(shard.spin);

      const materialize = Math.max(
        smoothstep(shard.reveal - 0.12, shard.reveal, input.reveal),
        (input.trace ?? 0) * 0.48 * (1 - input.reveal * 0.6),
      );
      const size = shard.size * materialize;
      this.scale.set(size * (1 + evolution * 0.12), size, size * (1 + evolution * 0.3));
      this.matrix.compose(this.position, this.quaternion, this.scale);
      this.mesh.setMatrixAt(index, this.matrix);

      // At rest the shell carries no heat: any baseline ember tints the whole graphite
      // surface, so warmth only appears where the visitor touches the matter.
      const scan = input.scan ?? 2;
      const scanBand = Math.exp(-Math.pow((shard.home.y / 2.7 - scan) * 9, 2));
      const seam = shard.seed > 0.96 ? evolution * 0.12 : 0;
      const heatTarget = input.glow * 0.004 + proximity * 0.48 + scanBand * 0.2 + seam;
      shard.heat += (heatTarget - shard.heat) * (1 - Math.exp(-dt * 6));
      this.heatAttribute.setX(index, shard.heat);
    });

    this.mesh.instanceMatrix.needsUpdate = true;
    this.heatAttribute.needsUpdate = true;
  }

  // Pushes shards away from a point, as when the visitor taps the entity.
  settle() {
    this.shards.forEach(shard => {
      shard.offset.set(0, 0, 0);
      shard.velocity.set(0, 0, 0);
      shard.spin.identity();
      shard.spinRate.set(0, 0, 0);
    });
  }

  burst(point: Vector3, strength: number) {
    this.shards.forEach((shard) => {
      const distance = shard.home.distanceTo(point);
      if (distance > TAP_REACH) return;
      const falloff = (1 - distance / TAP_REACH) ** 2;
      this.direction.subVectors(shard.home, point).normalize();
      shard.velocity.addScaledVector(this.direction, strength * falloff).clampLength(0, MAX_VELOCITY);
      shard.spinRate.addScaledVector(this.direction, strength * falloff * 2);
    });
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}
