import {
  NeutralToneMapping,
  Group,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Texture,
} from "three";
import { CameraRig } from "../../core/camera";
import { createFrameLoop } from "../../core/frameLoop";
import { createStudioEnvironment, disposeEnvironment, type Softbox } from "../../core/lighting";
import { clamp, damp, lerp } from "../../core/math";
import { createPostProcessing, type PostProcessing } from "../../core/postprocessing";
import { Spring } from "../../core/spring";
import {
  createTemperament,
  easeIntent,
  intentFor,
  MOOD_LABELS,
  stepTemperament,
  TIMING,
  type Intent,
  type Temperament,
} from "./behavior";
import { createDirector, playIntro, playMetamorphosis, type Director } from "./choreography";
import { CAMERA_BASE, CAMERA_INTRO, ENTITY, qualityFor } from "./config";
import { Dust } from "./dust";
import { createRings, createShell } from "./geometry";
import { Kernel } from "./kernel";
import { ShardSwarm } from "./shards";

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  compact: boolean;
  reduced: boolean;
  // Called when the readable state changes ("emergindo", "observando", ...).
  onState(label: string): void;
  onSequence(active: boolean): void;
  onContextLost(): void;
};

export type EntityScene = {
  setSize(width: number, height: number): void;
  setVisible(visible: boolean): void;
  setReduced(reduced: boolean): void;
  // Pointer position in normalized device coordinates, -1 to 1.
  pointer(x: number, y: number): void;
  leave(): void;
  tap(x: number, y: number): void;
  metamorphose(): boolean;
  dispose(): void;
};

type Phase = "intro" | "awake" | "sequence";
type Timeline = ReturnType<typeof playIntro>;

// Cold light from the sides, and a large panel in front of the camera. A metal
// reflects along its normal, so that panel is what gives the facing shards their
// sheen. The ember comes only from the core, never from the environment.
const SOFTBOXES: Softbox[] = [
  { color: "#e6eeff", intensity: 2.6, position: [0.5, 2.5, 12], size: [12, 6] },
  { color: "#dfe9ff", intensity: 4, position: [-7, 7, 5], size: [7, 1.2] },
  { color: "#7fb0ff", intensity: 5, position: [9, 0.5, -4], size: [1.2, 11] },
  { color: "#6d58d6", intensity: 0.9, position: [0, -9, 4], size: [16, 3] },
];

const BASE_BLOOM = 0.55;

export function createEntityScene(options: SceneOptions): EntityScene {
  const { canvas, compact, onState, onSequence } = options;
  const quality = qualityFor(compact);
  let reduced = options.reduced;

  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.setClearColor(ENTITY.palette.void, 1);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new Scene();
  const envTexture: Texture = createStudioEnvironment(renderer, SOFTBOXES, ENTITY.palette.void);
  scene.environment = envTexture;
  scene.environmentIntensity = 0.9;

  const rig = new CameraRig(reduced ? { ...CAMERA_BASE } : { ...CAMERA_INTRO });
  const group = new Group();
  group.rotation.order = "YXZ";
  scene.add(group);

  const slots = createShell(quality.shards, ENTITY.radius, ENTITY.aperture);
  const rings = createRings(slots.length, ENTITY.radius);
  const swarm = new ShardSwarm(slots, rings, ENTITY.radius);
  const kernel = new Kernel(ENTITY.radius);
  const dust = new Dust(quality.dust, ENTITY.radius * 1.25, ENTITY.radius * 2.3, quality.pixelRatio);
  group.add(swarm.mesh, kernel.group);
  scene.add(dust.points);

  const director: Director = createDirector();
  let temperament: Temperament = createTemperament();
  let intent: Intent = intentFor("dreaming");
  let phase: Phase = "intro";
  // Exposed on the canvas so tests and the overlay can read the phase without a callback.
  const setPhase = (next: Phase) => {
    phase = next;
    canvas.dataset.phase = next;
  };
  canvas.dataset.phase = phase;
  let lastLabel = "";
  let sequence: Timeline | null = null;
  let intro: Timeline | null = null;
  let disposed = false;

  const yawSpring = new Spring(0, 14);
  const pitchSpring = new Spring(0, 14);
  const follower = new Vector3();
  const cursorRaw = new Vector3();
  // Speed is measured on the screen, not on the entity: the camera moves during the
  // intro and the metamorphosis, and that motion must not read as the visitor's.
  const previousNdc = new Vector2();
  let speed = 0;
  let followerSpeed = 0;
  let lean = 0;
  let present = false;
  const pointerNdc = new Vector2();
  const raycaster = new Raycaster();
  const plane = new Plane();
  const facing = new Vector3();
  const hit = new Vector3();
  const local = new Vector3();

  const post: PostProcessing = createPostProcessing(renderer, scene, rig.camera, 1, 1);
  let width = 1;
  let height = 1;

  // Projects the pointer onto the plane facing the camera through the entity.
  // Fills `cursorRaw` (world) and `local` (entity space). Returns false when absent.
  function resolveCursor() {
    if (!present) return false;
    raycaster.setFromCamera(pointerNdc, rig.camera);
    facing.copy(rig.camera.position).sub(group.position).normalize();
    plane.setFromNormalAndCoplanarPoint(facing, group.position);
    if (!raycaster.ray.intersectPlane(plane, hit)) return false;
    cursorRaw.copy(hit);
    local.copy(hit);
    group.worldToLocal(local);
    return true;
  }

  function tick(dt: number, elapsed: number) {
    if (disposed) return;
    const motion = reduced ? 0 : 1;
    group.updateMatrixWorld();

    // The entity perceives the visitor only after the intro.
    const attentive = phase === "awake" && resolveCursor();
    // Pointer movement in the screen plane, scaled to scene units at the entity's depth.
    const depth = rig.camera.position.distanceTo(group.position);
    const unitsPerNdc = depth * Math.tan((rig.camera.fov * Math.PI) / 360);
    const moved = attentive ? pointerNdc.distanceTo(previousNdc) * unitsPerNdc : 0;
    speed = damp(speed, dt > 0 ? moved / dt : 0, 10, dt);
    previousNdc.copy(pointerNdc);

    // Nearness is measured from the silhouette, not from the raw pixel position.
    const planar = Math.hypot(local.x, local.y);
    const near = attentive && planar - ENTITY.radius < TIMING.near;
    const sense = { dt, present: attentive, near, speed };
    temperament = stepTemperament(temperament, sense);
    intent = easeIntent(intent, intentFor(temperament.mood), dt);

    const label = phase === "intro" ? "emergindo" : phase === "sequence" ? "metamorfose" : MOOD_LABELS[temperament.mood];
    if (label !== lastLabel) {
      lastLabel = label;
      onState(label);
      if (temperament.mood === "wary" && phase === "awake") post.ripple(0.5 + cursorRaw.x * 0.05, 0.5 + cursorRaw.y * 0.05, 0.6);
    }

    // Gaze: the entity turns toward the visitor with a heavy, slightly overshooting spring.
    const trackYaw = attentive ? clamp(cursorRaw.x * 0.16, -0.7, 0.7) : 0;
    const trackPitch = attentive ? clamp(-cursorRaw.y * 0.12, -0.4, 0.4) : 0;
    const wanderYaw = Math.sin(elapsed * 0.13) * 0.45;
    const wanderPitch = Math.sin(elapsed * 0.09) * 0.12;
    let yawGoal = lerp(wanderYaw, trackYaw, intent.gaze);
    let pitchGoal = lerp(wanderPitch, trackPitch, intent.gaze);
    if (intent.away) {
      yawGoal = wanderYaw + Math.PI * 0.8;
      pitchGoal = wanderPitch;
    }
    if (reduced) {
      yawGoal = 0;
      pitchGoal = 0;
    }
    group.rotation.set(pitchSpring.step(pitchGoal, dt), yawSpring.step(yawGoal, dt), 0);

    // Approach and recoil move the whole entity along the view axis.
    lean = damp(lean, reduced ? 0 : intent.lean * 0.9, 1.6, dt);
    group.position.z = lean;

    // Core: ignited during the intro, then driven by mood. The flash adds to it.
    const light = director.core * (0.35 + 0.65 * intent.light) + director.flash * 0.9;
    kernel.update({ light, warmth: intent.warmth, elapsed });

    // Shards follow the cursor with a short delay, which reads as inertia.
    if (attentive) {
      follower.lerp(local, 1 - Math.exp(-dt * 5));
    }
    followerSpeed = damp(followerSpeed, attentive ? speed : 0, 8, dt);
    swarm.update({
      dt,
      elapsed,
      morph: director.morph,
      disperse: director.disperse,
      reveal: director.reveal,
      motion: motion * (1 + director.flash * 1.2),
      cursor: attentive ? follower : null,
      cursorSpeed: followerSpeed,
      reactivity: reduced ? 0 : intent.reactivity,
      glow: director.core * intent.light,
    });

    dust.update(elapsed, temperament.attention * motion, light);
    rig.setPointer(attentive ? pointerNdc.x : 0, attentive ? pointerNdc.y : 0);
    rig.update(dt, elapsed, motion);

    post.bloom.strength = BASE_BLOOM + director.core * 0.15 + director.flash * 0.9;
    post.render(dt, elapsed);
    if (!canvas.dataset.ready) canvas.dataset.ready = "true";
  }

  const loop = createFrameLoop(tick);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    loop.setVisible(false);
    options.onContextLost();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  function setSize(nextWidth: number, nextHeight: number) {
    width = Math.max(1, Math.round(nextWidth));
    height = Math.max(1, Math.round(nextHeight));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, quality.pixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    rig.setAspect(width / height);
    post.setSize(width, height, pixelRatio);
  }

  setSize(canvas.clientWidth || 1, canvas.clientHeight || 1);

  if (reduced) {
    director.core = 1;
    director.reveal = 1;
    setPhase("awake");
  } else {
    intro = playIntro(director, rig.goal, () => setPhase("awake"));
  }

  return {
    setSize,
    setVisible(visible) {
      loop.setVisible(visible);
    },
    setReduced(value) {
      reduced = value;
    },
    pointer(x, y) {
      // A visitor who re-enters the view must not appear to have jumped across it.
      if (!present) previousNdc.set(x, y);
      pointerNdc.set(x, y);
      present = true;
    },
    leave() {
      present = false;
    },
    tap(x, y) {
      pointerNdc.set(x, y);
      present = true;
      if (!resolveCursor()) return;
      if (phase === "awake" && !reduced) {
        swarm.burst(local, 2.4);
      }
      post.ripple(x * 0.5 + 0.5, y * 0.5 + 0.5, 0.8);
    },
    metamorphose() {
      if (phase !== "awake") return false;
      setPhase("sequence");
      onSequence(true);
      post.ripple(0.5, 0.5, 1);
      sequence = playMetamorphosis(director, rig.goal, reduced, () => {
        sequence = null;
        setPhase("awake");
        onSequence(false);
      });
      return true;
    },
    dispose() {
      disposed = true;
      loop.dispose();
      intro?.kill();
      sequence?.kill();
      canvas.removeEventListener("webglcontextlost", onContextLost);
      swarm.dispose();
      kernel.dispose();
      dust.dispose();
      post.dispose();
      disposeEnvironment(envTexture);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
