import {
  ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, Group, Plane,
  PointLight, Raycaster, Scene, Vector2, Vector3, WebGLRenderer,
} from "three";
import { CameraRig } from "../../core/camera";
import { createFrameLoop } from "../../core/frameLoop";
import { createStudioEnvironment, disposeEnvironment, type Softbox } from "../../core/lighting";
import { clamp, damp, lerp } from "../../core/math";
import { createPostProcessing } from "../../core/postprocessing";
import { Spring } from "../../core/spring";
import { Atmosphere } from "./atmosphere";
import { createTemperament, easeIntent, intentFor, MOOD_LABELS, stepTemperament } from "./behavior";
import { CAMERA_BASE, CAMERA_INTRO, ENTITY, qualityFor } from "./config";
import { Dust } from "./dust";
import { createRings, createShell } from "./geometry";
import { Kernel } from "./kernel";
import { Perception } from "./perception";
import { createPerformance } from "./performance";
import { ShardSwarm } from "./shards";

export type SceneOptions = {
  canvas: HTMLCanvasElement; compact: boolean; reduced: boolean;
  onState(label: string): void; onSequence(active: boolean): void;
  onContextLost(): void; onEnergy?(value: number): void; onCue?(): void;
};
export type EntityScene = {
  setSize(width: number, height: number): void; setVisible(visible: boolean): void;
  setReduced(reduced: boolean): void; pointer(x: number, y: number): void;
  leave(): void; tap(x: number, y: number): void; hold(active: boolean): void;
  metamorphose(): boolean; dispose(): void;
};

const SOFTBOXES: Softbox[] = [
  { color: "#d1dbe0", intensity: 2.3, position: [-3, 6, 9], size: [9, 5] },
  { color: "#82b5ce", intensity: 3.2, position: [6, 2, -5], size: [2, 10] },
  { color: "#c6d8dc", intensity: 1.8, position: [-7, 1, 2], size: [1.2, 9] },
  { color: "#daa06c", intensity: 0.65, position: [3, -3, 5], size: [3, 2] },
];

export function createEntityScene(options: SceneOptions): EntityScene {
  const { canvas } = options;
  const quality = qualityFor(options.compact);
  let reduced = options.reduced;
  let disposed = false;
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  const releases: (() => void)[] = [() => { renderer.dispose(); renderer.forceContextLoss(); }];
  const free = () => releases.splice(0).reverse().forEach(release => {
    try { release(); } catch { /* Continue releasing the remaining GPU owners. */ }
  });
  try {
    renderer.setClearColor(ENTITY.palette.void, 1);
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const scene = new Scene();
    scene.fog = new FogExp2(ENTITY.palette.void, 0.022);
    const environment = createStudioEnvironment(renderer, SOFTBOXES, ENTITY.palette.void);
    releases.push(() => disposeEnvironment(environment));
    scene.environment = environment;
    const key = new DirectionalLight("#d9e2e3", 1.8);
    key.position.set(-4, 6, 7);
    const rim = new DirectionalLight(ENTITY.palette.frost, 2.6);
    rim.position.set(4, 2, -5);
    const heart = new PointLight(ENTITY.palette.ember, 0, 5, 2);
    heart.position.set(0, ENTITY.eye.y, ENTITY.eye.z - 0.25);
    scene.add(key, rim, heart);

    const rig = new CameraRig(reduced ? CAMERA_BASE : CAMERA_INTRO, 3.3);
    const group = new Group();
    group.rotation.order = "YXZ";
    scene.add(group);
    const slots = createShell(quality.shards, ENTITY.radius, ENTITY.aperture);
    const swarm = new ShardSwarm(slots, createRings(slots.length, ENTITY.radius), ENTITY.radius);
    releases.push(() => swarm.dispose());
    const kernel = new Kernel(ENTITY.radius);
    releases.push(() => kernel.dispose());
    const dust = new Dust(quality.dust, ENTITY.radius * 1.4, ENTITY.radius * 4.8, quality.pixelRatio);
    releases.push(() => dust.dispose());
    const atmosphere = new Atmosphere();
    releases.push(() => atmosphere.dispose());
    group.add(swarm.mesh, kernel.group);
    scene.add(dust.points, atmosphere.group);
    const post = createPostProcessing(renderer, scene, rig.camera, 1, 1);
    releases.push(() => post.dispose());
    let temperament = createTemperament();
    let intent = intentFor("dreaming");
    let lastLabel = "";
    let breathPhase = 0;
    let energyTime = 0;
    let renderScale = 1;
    let sizeW = 1, sizeH = 1, qualityTime = 0, slowFrames = 0;
    let contact = 0;
    let lean = 0;
    let speed = 0;
    let present = false;
    const perception = new Perception();
    const yaw = new Spring(0, 18);
    const pitch = new Spring(0, 15);
    const cursor = new Vector2();
    const previous = new Vector2();
    const follower = new Vector3();
    const raycaster = new Raycaster();
    const plane = new Plane();
    const facing = new Vector3();
    const hit = new Vector3();
    const local = new Vector3();
    const anchor = new Vector3();
    const lightColor = new Color();
    const ember = new Color(ENTITY.palette.ember);
    const frost = new Color(ENTITY.palette.frost);

    const performance = createPerformance(rig.goal, reduced, {
      onPhase(phase) {
        canvas.dataset.phase = phase;
        if (phase === "awake") temperament = createTemperament();
      },
      onSequence: options.onSequence,
      onCue: options.onCue,
    });
    releases.push(() => performance.dispose());
    canvas.dataset.phase = performance.phase;
    const director = performance.director;

    function resolveCursor() {
      if (!present) return false;
      group.updateMatrixWorld(true);
      raycaster.setFromCamera(cursor, rig.camera);
      facing.copy(rig.camera.position).sub(group.position).normalize();
      anchor.set(0, ENTITY.eye.y, ENTITY.eye.z).applyMatrix4(group.matrixWorld);
      plane.setFromNormalAndCoplanarPoint(facing, anchor);
      if (!raycaster.ray.intersectPlane(plane, hit)) return false;
      local.copy(hit);
      group.worldToLocal(local);
      return true;
    }
    const isNear = () => Math.hypot(local.x / (ENTITY.radius * 0.91), local.y / (ENTITY.radius * 1.27)) < 1.18;

    function tick(dt: number, elapsed: number, frameDt: number) {
      if (disposed) return;
      performance.step(frameDt);
      const awake = performance.phase === "awake";
      if (awake) director.flash *= Math.exp(-dt * 3);
      const attentive = awake && resolveCursor();
      const depth = rig.camera.position.distanceTo(group.position);
      const units = depth * Math.tan((rig.camera.fov * Math.PI) / 360);
      const moved = attentive ? cursor.distanceTo(previous) * units : 0;
      speed = damp(speed, frameDt > 0 ? moved / frameDt : 0, 9, frameDt);
      previous.copy(cursor);
      contact = Math.max(0, contact - frameDt);
      if (awake) temperament = stepTemperament(temperament, {
        dt: frameDt, present: attentive, near: attentive && isNear(), speed,
        contact: contact > 0,
      });
      intent = easeIntent(intent, intentFor(temperament.mood), frameDt);
      const gaze = perception.step(cursor.x, cursor.y, attentive, temperament.mood, frameDt);
      const motion = reduced ? 0 : 1;
      breathPhase += frameDt * intent.rhythm * motion;
      const breath = Math.sin(breathPhase * 1.5);
      const gesture = awake ? intent.gaze : 0;
      const tremor = Math.sin(elapsed * 23.7) * Math.sin(elapsed * 12.1) * intent.tremor * 0.018;
      const wander = Math.sin(elapsed * 0.13) * 0.12;
      const yawGoal = intent.away && awake ? 2.2 + wander : lerp(wander, gaze.x * 0.7, gesture);
      const pitchGoal = intent.tilt + gaze.y * -0.2 * gesture;
      if (reduced) {
        yaw.value = 0; yaw.velocity = 0; pitch.value = 0; pitch.velocity = 0;
        group.rotation.set(0, 0, 0);
      } else {
        group.rotation.set(pitch.step(pitchGoal, dt) + tremor,
          yaw.step(yawGoal, dt), intent.roll * 0.4 + tremor * 0.4);
      }
      lean = damp(lean, awake && !reduced ? intent.lean : 0, 1.5, dt);
      group.position.set(0, breath * 0.024 * motion, lean);
      group.scale.setScalar(1 + breath * 0.006 * motion);
      const light = director.core * (awake ? intent.light : 0.9) + director.flash * 0.35 + performance.charge * 0.25;
      const openness = reduced ? 0.85 : director.eye * (awake ? intent.openness * (1 - gaze.blink * 0.75) : 1);
      kernel.update({ light, warmth: intent.warmth, elapsed: reduced ? 0 : elapsed,
        openness, agitation: intent.tremor * motion, gazeX: gaze.x * motion, gazeY: gaze.y * motion,
        dive: director.dive, evolution: director.evolution });

      if (attentive) follower.lerp(local, 1 - Math.exp(-dt * 3.5));
      swarm.update({ dt, elapsed: reduced ? 0 : elapsed,
        morph: director.morph, disperse: director.disperse, reveal: director.reveal,
        motion, cursor: attentive && !reduced && !intent.away ? follower : null,
        cursorSpeed: speed, reactivity: reduced ? 0 : intent.reactivity, glow: light,
        breath, agitation: intent.tremor, spread: reduced ? 0 : intent.spread,
        evolution: director.evolution, contraction: director.contraction,
        scan: director.scan, trace: director.rim });

      const label = performance.phase === "intro" ? "despertando"
        : performance.phase === "sequence" ? "ressonância" : MOOD_LABELS[temperament.mood];
      if (label !== lastLabel) {
        lastLabel = label; options.onState(label);
        canvas.dataset.mood = temperament.mood;
      }
      canvas.dataset.evolution = director.evolution > 0.9 ? "awakened" : "latent";
      canvas.dataset.charge = performance.charge.toFixed(2);
      canvas.dataset.storyTime = performance.time.toFixed(2);
      scene.environmentIntensity = 0.15 + director.key * 0.7;
      key.intensity = director.key * (awake ? 1.45 + intent.openness * 0.35 : 1.75);
      rim.intensity = director.rim * (awake ? 1.8 + intent.tremor : 2.4);
      lightColor.copy(frost).lerp(ember, intent.warmth);
      heart.color.copy(lightColor);
      heart.intensity = light * 1.2;
      dust.update(reduced ? 0 : elapsed, temperament.attention * motion, light * director.atmosphere);
      rig.setPointer(attentive && !intent.away ? gaze.x : 0, attentive && !intent.away ? gaze.y : 0);
      rig.setFocus(0, ENTITY.eye.y * 0.4, lean * 0.3);
      rig.setExpression(awake ? intent.camera : 0, awake ? intent.orbit : 0, awake ? intent.roll * 0.025 : 0);
      rig.update(Math.min(frameDt, 0.1), elapsed, motion);
      atmosphere.update(rig.camera, elapsed, director.atmosphere, light, director.morph + director.evolution * 0.12, reduced);
      post.bloom.strength = 0.28 + light * 0.11 + director.flash * 0.12;
      post.finish.uniforms.uVignette.value = 0.42 + director.dive * 0.13;
      post.finish.uniforms.uAberration.value = reduced ? 0 : 0.00065 + director.dive * 0.001;
      post.render(dt, reduced ? 0 : elapsed);
      if (!canvas.dataset.ready) canvas.dataset.ready = "true";
      qualityTime += frameDt;
      if (frameDt > 0.075) slowFrames++;
      if (qualityTime > 2.5 && slowFrames > 12 && renderScale > 0.65) {
        renderScale = Math.max(0.65, renderScale * 0.82);
        setSize(sizeW, sizeH);
        qualityTime = 0; slowFrames = 0;
      }
      energyTime += frameDt;
      if (energyTime > 0.15) { options.onEnergy?.(clamp(light * 0.4 + director.dive * 0.4)); energyTime = 0; }
    }
    const loop = createFrameLoop(tick);
    releases.push(() => loop.dispose());
    const onContextLost = (event: Event) => {
      event.preventDefault(); loop.setVisible(false); options.onContextLost();
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    releases.push(() => canvas.removeEventListener("webglcontextlost", onContextLost));

    const setSize = (width: number, height: number) => {
      const w = Math.max(1, Math.round(width));
      const h = Math.max(1, Math.round(height));
      sizeW = w; sizeH = h;
      const dpr = Math.min(window.devicePixelRatio || 1, quality.pixelRatio, Math.sqrt(1100000 / (w * h))) * renderScale;
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      dust.setPixelRatio(dpr);
      rig.setAspect(w / h);
      post.setSize(w, h, dpr);
    };
    setSize(canvas.clientWidth || 1, canvas.clientHeight || 1);
    if (reduced) { rig.setFocus(0, ENTITY.eye.y * 0.4, 0); rig.snap(); }
    rig.update(0, 0, 0);
    loop.start();

    return {
      setSize,
      setVisible: loop.setVisible,
      setReduced(value) {
        reduced = value; performance.setReduced(value);
        if (value) {
          lean = 0; rig.setFocus(0, ENTITY.eye.y * 0.4, 0); rig.snap(); swarm.settle();
        }
      },
      pointer(x, y) {
        if (!present) previous.set(x, y);
        cursor.set(x, y); present = true;
      },
      leave() { present = false; performance.hold(false); },
      hold(active) { performance.hold(active && resolveCursor() && isNear()); },
      tap(x, y) {
        cursor.set(x, y); present = true;
        if (performance.phase !== "awake" || !resolveCursor()) return;
        if (!reduced) { swarm.burst(local, 1.2); contact = 0.4; }
        if (!reduced) post.ripple(x * 0.5 + 0.5, y * 0.5 + 0.5, 0.22);
        else director.flash = 0.15;
      },
      metamorphose: performance.metamorphose,
      dispose() {
        if (disposed) return;
        disposed = true;
        free(); scene.clear();
      },
    };
  } catch (error) {
    disposed = true;
    free();
    throw error;
  }
}
