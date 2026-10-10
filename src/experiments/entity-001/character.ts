import {
  AnimationMixer, Color, Euler, LoopOnce, LoopRepeat, MeshStandardMaterial, Quaternion, Vector3,
  type AnimationAction, type AnimationClip, type BufferGeometry, type Material, type Mesh, type Object3D,
} from "three";
import { loadGltf } from "../../core/assets";
import { clamp, damp, smoothstep } from "../../core/math";
import { Spring } from "../../core/spring";
import type { Mood } from "./behavior";
import type { Phase } from "./performance";

export type ClipName = "AWAKEN" | "IDLE";
export const CHARACTER_SCALE = 9.5;
const SKULL_HEIGHT = 1.7;
const LID_TRAVEL = 0.17;
// These channels have one owner: the live gaze/lid rig or continuous orbital clock.
const LIVE_CHANNELS = new Set(["CTRL_EYE", "CTRL_IRIS", "CTRL_PUPIL", "LID_UPPER", "LID_LOWER", "GYRO_A", "GYRO_B", "PLATE_JAW"]);
export function characterUrl(base: string, compact: boolean) {
  return `${base}3d/entity-001/entity-${compact ? "optimized" : "cinematic"}.glb`;
}
export function clipFor(phase: Phase, reduced: boolean): ClipName | null {
  return reduced ? null : phase === "intro" ? "AWAKEN" : "IDLE";
}
export type CharacterInput = {
  dt: number; phase: Phase; storyTime: number; mood: Mood; reduced: boolean;
  light: number; warmth: number; openness: number; lookYaw: number; lookPitch: number;
  gazeX: number; gazeY: number; opening?: number; resonance?: number;
};
type Plate = { node: Object3D; position: Vector3; quaternion: Quaternion; offset: Vector3; openRotation: Quaternion };

export class Character {
  readonly root: Object3D;
  private readonly mixer: AnimationMixer;
  private readonly actions = new Map<ClipName, AnimationAction>();
  private readonly look: Object3D;
  private readonly gaze: Object3D;
  private readonly upper: Object3D;
  private readonly lower: Object3D;
  private readonly iris: Object3D;
  private readonly pupil: Object3D;
  private readonly lookRest: Quaternion;
  private readonly gazeRest: Quaternion;
  private readonly irisRest: Quaternion;
  private readonly pupilRest: Vector3;
  private readonly lidRest: [number, number];
  private readonly gyros: { node: Object3D; rest: Quaternion; axis: Vector3; phase: number }[];
  private readonly plates: Plate[] = [];
  private readonly glow: { material: MeshStandardMaterial; ceiling: number }[] = [];
  private readonly ember: MeshStandardMaterial[] = [];
  private readonly ownedMaterials: Material[] = [];
  private readonly ownedGeometry: BufferGeometry[] = [];
  private readonly emberColor = new Color("#ed9b56");
  private readonly frostColor = new Color("#93b8cb");
  private readonly eyeOpening = new Spring(0.85, 64);
  private readonly plateOpening = new Spring(0, 20);
  private readonly emission = new Spring(0, 25);
  private readonly rotation = new Quaternion();
  private readonly offsetEuler = new Euler(0, 0, 0, "YXZ");
  private current: ClipName | null = null;
  private previous: AnimationAction | null = null;
  private fadeTime = 0;
  private focusTime = 0;
  private disposed = false;

  private constructor(root: Object3D, animations: AnimationClip[]) {
    this.root = root;
    root.scale.setScalar(CHARACTER_SCALE);
    root.position.set(0, -SKULL_HEIGHT * CHARACTER_SCALE, 0);
    const find = (name: string) => {
      const node = root.getObjectByName(name);
      if (!node) throw new Error(`ENTITY 001 model is missing ${name}`);
      return node;
    };
    this.look = find("CTRL_LOOK"); this.gaze = find("CTRL_GAZE");
    this.upper = find("LID_UPPER"); this.lower = find("LID_LOWER");
    this.iris = find("CTRL_IRIS"); this.pupil = find("CTRL_PUPIL");
    this.lookRest = this.look.quaternion.clone(); this.gazeRest = this.gaze.quaternion.clone();
    this.irisRest = this.iris.quaternion.clone(); this.pupilRest = this.pupil.scale.clone();
    this.lidRest = [this.upper.rotation.x, this.lower.rotation.x];
    this.gyros = [
      { name: "GYRO_A", axis: new Vector3(0, 1, 0), phase: 0 },
      { name: "GYRO_B", axis: new Vector3(1, 0, 0), phase: 0 },
    ].flatMap(({ name, axis, phase }) => {
      const node = root.getObjectByName(name);
      return node ? [{ node, rest: node.quaternion.clone(), axis, phase }] : [];
    });

    // Cache data is immutable. Each mounted character owns its geometry and
    // materials; embedded textures remain shared with the loader cache.
    const materials = new Map<Material, Material>();
    const geometries = new Map<BufferGeometry, BufferGeometry>();
    root.traverse(node => {
      if (Array.isArray(node.userData.ovra_open_position)) {
        const angles = node.userData.ovra_open_rotation ?? [0, 0, 0];
        this.plates.push({ node, position: node.position.clone(), quaternion: node.quaternion.clone(),
          offset: new Vector3().fromArray(node.userData.ovra_open_position),
          openRotation: new Quaternion().setFromEuler(new Euler(angles[0], angles[1], angles[2], "YXZ")) });
      }
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      let geometry = geometries.get(mesh.geometry);
      if (!geometry) {
        geometry = mesh.geometry.clone(); geometries.set(mesh.geometry, geometry); this.ownedGeometry.push(geometry);
      }
      mesh.geometry = geometry;
      const own = (source: Material) => {
        let material = materials.get(source);
        if (material) return material;
        material = source.clone(); materials.set(source, material); this.ownedMaterials.push(material);
        const standard = material as MeshStandardMaterial;
        if (standard.isMeshStandardMaterial && standard.emissiveIntensity > 0 && standard.emissive.getHex() !== 0) {
          const ceiling = standard.name === "M_SensorGlow" ? 1.25 : standard.name === "M_CoreEmber" ? 1.1 : 0.5;
          this.glow.push({ material: standard, ceiling });
          standard.emissiveIntensity = 0;
          if (standard.name === "M_CoreEmber") this.ember.push(standard);
        }
        return material;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
    });
    this.mixer = new AnimationMixer(root);
    for (const name of ["AWAKEN", "IDLE"] as const) {
      const authored = animations.find(clip => clip.name === name);
      if (!authored) continue;
      const clip = authored.clone();
      clip.tracks = clip.tracks.filter(track => !LIVE_CHANNELS.has(track.name.slice(0, track.name.lastIndexOf("."))));
      const action = this.mixer.clipAction(clip);
      action.setLoop(name === "AWAKEN" ? LoopOnce : LoopRepeat, name === "AWAKEN" ? 1 : Infinity);
      action.clampWhenFinished = name === "AWAKEN";
      this.actions.set(name, action);
    }
  }
  static async load(url: string) {
    const gltf = await loadGltf(url);
    return new Character(gltf.scene.clone(true), gltf.animations);
  }
  update(input: CharacterInput) {
    if (this.disposed) return;
    const dt = clamp(input.dt, 0, 0.25);
    this.play(clipFor(input.phase, input.reduced));
    const current = this.current ? this.actions.get(this.current) : undefined;
    if (current && this.current === "AWAKEN") current.time = Math.min(input.storyTime, current.getClip().duration);
    if (current && this.current === "IDLE") {
      current.timeScale = damp(current.timeScale, input.mood === "dreaming" || input.mood === "ignoring" ? 0.55 : 0.68, 1, dt);
    }
    if (current && this.previous) {
      this.fadeTime += dt;
      const weight = smoothstep(0, 1.2, this.fadeTime);
      current.setEffectiveWeight(weight); this.previous.setEffectiveWeight(1 - weight);
      if (weight === 1) { this.previous.stop(); this.previous = null; }
    }
    this.mixer.update(input.reduced ? 0 : dt);
    const openness = input.reduced ? 0.85 : this.eyeOpening.step(clamp(input.openness, 0.15, 1), dt);
    const opening = input.reduced ? 0 : this.plateOpening.step(clamp(input.opening ?? 0, -0.025, 0.16), dt);
    if (input.reduced) { this.eyeOpening.snap(0.85); this.plateOpening.snap(0); }
    this.look.quaternion.copy(this.lookRest).multiply(this.rotation.setFromEuler(
      this.offsetEuler.set(input.reduced ? 0 : input.lookPitch, input.reduced ? 0 : input.lookYaw, 0)));
    this.gaze.quaternion.copy(this.gazeRest).multiply(this.rotation.setFromEuler(
      this.offsetEuler.set(input.reduced ? 0 : -input.gazeY * 0.065, input.reduced ? 0 : input.gazeX * 0.18, 0)));
    const closing = LID_TRAVEL * (1 - openness);
    this.upper.rotation.x = Math.min(0, this.lidRest[0] + closing);
    this.lower.rotation.x = Math.max(0, this.lidRest[1] - closing);
    if (input.phase !== "intro") {
      for (const plate of this.plates) {
        plate.node.position.copy(plate.position).addScaledVector(plate.offset, opening);
        this.rotation.identity().slerp(plate.openRotation, opening);
        plate.node.quaternion.copy(plate.quaternion).multiply(this.rotation);
      }
    }
    const level = this.emission.step(clamp(input.light, 0, 1.05), dt);
    for (const { material, ceiling } of this.glow) material.emissiveIntensity = ceiling * level;
    for (const material of this.ember) material.emissive.copy(this.frostColor).lerp(this.emberColor, clamp(input.warmth));
    if (!input.reduced) this.focusTime += dt;
    this.iris.quaternion.copy(this.irisRest).multiply(this.rotation.setFromEuler(
      this.offsetEuler.set(0, 0, Math.sin(this.focusTime * 0.23) * 0.035)));
    this.pupil.scale.copy(this.pupilRest).multiplyScalar(input.reduced ? 1 : 0.94 + level * 0.06);
    this.gyros.forEach((gyro, i) => {
      if (!input.reduced) gyro.phase += dt * (i ? -0.052 : 0.06) * (1 + (input.resonance ?? 0) * 0.2);
      gyro.node.quaternion.copy(gyro.rest).multiply(this.rotation.setFromAxisAngle(gyro.axis, gyro.phase));
    });
  }
  private play(name: ClipName | null) {
    if (name === this.current) return;
    const previous = this.current ? this.actions.get(this.current) : undefined;
    const next = name ? this.actions.get(name) : undefined;
    this.previous?.stop(); this.previous = null;
    if (next) {
      next.reset().setEffectiveWeight(previous ? 0 : 1);
      next.timeScale = name === "AWAKEN" ? 0 : 0.68;
      next.play();
      this.previous = previous ?? null; this.fadeTime = 0;
    } else this.mixer.stopAllAction();
    this.current = name;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root);
    this.root.removeFromParent();
    this.ownedGeometry.forEach(geometry => geometry.dispose());
    this.ownedMaterials.forEach(material => material.dispose());
  }
}
