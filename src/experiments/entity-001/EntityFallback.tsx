import { Vector3 } from "three";
import { createFrameLoop } from "../../core/frameLoop";
import { clamp, damp } from "../../core/math";
import { createTemperament, easeIntent, intentFor, MOOD_LABELS, stepTemperament } from "./behavior";
import { CAMERA_BASE, CAMERA_INTRO, ENTITY } from "./config";
import { createShell } from "./geometry";
import { Perception } from "./perception";
import { createPerformance } from "./performance";
import type { EntityScene, SceneOptions } from "./scene";

// The essential renderer shares the performance and temperament with WebGL.
// It paints ordered metal facets and a dark iris, rather than a unrelated cloud.
export function createFallbackScene(options: SceneOptions): EntityScene {
  const { canvas } = options;
  const context = canvas.getContext("2d");
  const noop = () => undefined;
  if (!context) return { setSize: noop, setVisible: noop, setReduced: noop,
    pointer: noop, leave: noop, tap: noop, hold: noop, metamorphose: () => false, dispose: noop };

  const ctx: CanvasRenderingContext2D = context;
  let reduced = options.reduced;
  let width = 1, height = 1, dpr = 1;
  let present = false, speed = 0, contact = 0, lastLabel = "";
  const pointer = { x: 0, y: 0 }, previous = { x: 0, y: 0 };
  let temperament = createTemperament();
  let intent = intentFor("observing");
  const perception = new Perception();
  const goal = { ...(reduced ? CAMERA_BASE : CAMERA_INTRO) };
  const performance = createPerformance(goal, reduced, {
    onPhase: (phase) => { canvas.dataset.phase = phase; },
    onSequence: options.onSequence, onCue: options.onCue,
  });
  canvas.dataset.phase = performance.phase;
  const director = performance.director;
  const slots = createShell(options.compact ? 320 : 560, ENTITY.radius, ENTITY.aperture);
  const vertices = slots.map(slot => {
    const x = new Vector3(1, 0, 0).applyQuaternion(slot.orientation).multiplyScalar(slot.size);
    const z = new Vector3(0, 0, 1).applyQuaternion(slot.orientation).multiplyScalar(slot.size * 0.8);
    return [slot.position.clone().add(x), slot.position.clone().sub(x).add(z), slot.position.clone().sub(z)];
  });

  function draw(_dt: number, elapsed: number, frameDt: number) {
    performance.step(frameDt);
    const awake = performance.phase === "awake";
    speed = damp(speed, frameDt > 0 ? Math.hypot(pointer.x - previous.x, pointer.y - previous.y) * 4 / frameDt : 0, 9, frameDt);
    previous.x = pointer.x; previous.y = pointer.y;
    contact = Math.max(0, contact - frameDt);
    const near = Math.hypot(pointer.x * (width / height), pointer.y) < 0.75;
    if (awake) temperament = stepTemperament(temperament, { dt: frameDt, present, near, speed, contact: contact > 0 });
    intent = easeIntent(intent, intentFor(temperament.mood), frameDt);
    const gaze = perception.step(pointer.x, pointer.y, present, temperament.mood, frameDt);
    const yaw = reduced ? 0 : intent.away ? 2.1 : gaze.x * intent.gaze * 0.55 + Math.sin(elapsed * 0.13) * 0.06;
    const pitch = reduced ? 0 : intent.tilt - gaze.y * intent.gaze * 0.13;
    const zoom = Math.min(4, CAMERA_BASE.distance / goal.distance);
    const scale = Math.min(width * 0.205, height * 0.145) * zoom;
    const cx = width / 2, cy = height / 2;
    const rotation = (point: Vector3) => {
      const x = point.x * Math.cos(yaw) + point.z * Math.sin(yaw);
      const z = -point.x * Math.sin(yaw) + point.z * Math.cos(yaw);
      return { x, y: point.y * Math.cos(pitch) - z * Math.sin(pitch), z: point.y * Math.sin(pitch) + z * Math.cos(pitch) };
    };
    const project = (point: { x: number; y: number; z: number }) => {
      const perspective = 5 / (5 - point.z * 0.5);
      return { x: cx + point.x * scale * perspective, y: cy - point.y * scale * perspective };
    };
    ctx.fillStyle = ENTITY.palette.void; ctx.fillRect(0, 0, width, height);
    const haze = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height) * 0.6);
    haze.addColorStop(0, "rgba(60, 98, 114, 0.1)");
    haze.addColorStop(1, "rgba(3, 3, 4, 0)");
    ctx.fillStyle = haze; ctx.fillRect(0, 0, width, height);

    const facets = slots.map((slot, i) => ({ slot, i, center: rotation(slot.position) })).sort((a, b) => a.center.z - b.center.z);
    for (const { slot, i, center } of facets) {
      const threshold = clamp((slot.position.y + 2.7) / 5.4) * 0.65 + slot.seed * 0.25;
      const reveal = clamp((director.reveal - threshold) * 7);
      if (reveal <= 0) continue;
      const expand = 1 + director.disperse * (0.65 + slot.seed * 0.45);
      const band = Math.sin(i * 0.08 + elapsed * 0.05);
      const mapped = vertices[i].map((vertex) => {
        const p = rotation(vertex);
        if (director.morph > 0) {
          const a = (i / slots.length) * Math.PI * 8;
          p.x = p.x * (1 - director.morph) + Math.cos(a) * 2.55 * director.morph;
          p.y = p.y * (1 - director.morph) + Math.sin(a) * 1.5 * director.morph;
        }
        return project({ x: p.x * expand, y: p.y * expand, z: p.z + band * director.morph });
      });
      const shade = clamp((center.z / 2 + 1) * 0.5);
      const light = 0.2 + director.key * 0.8;
      ctx.fillStyle = "rgba(" + Math.round((35 + shade * 80) * light) + "," +
        Math.round((45 + shade * 90) * light) + "," + Math.round((54 + shade * 94) * light) + "," + reveal + ")";
      ctx.beginPath(); ctx.moveTo(mapped[0].x, mapped[0].y);
      ctx.lineTo(mapped[1].x, mapped[1].y); ctx.lineTo(mapped[2].x, mapped[2].y); ctx.closePath(); ctx.fill();
    }

    // The eye is drawn after the near-face facets, just as a lens sits in its socket.
    if (Math.cos(yaw) > 0.1) {
      const face = project(rotation(new Vector3(0, ENTITY.eye.y, ENTITY.eye.z * (1 - director.dive))));
      const ex = scale * 0.74;
      const openness = reduced ? 0.85 : director.eye * intent.openness * (1 - gaze.blink * 0.7);
      const ey = Math.max(1.5, scale * 0.3 * openness);
      const light = director.core * intent.light + director.flash * 0.4;
      ctx.save(); ctx.translate(face.x, face.y);
      ctx.scale(1, ey / ex);
      const iris = ctx.createRadialGradient(0, 0, ex * 0.1, 0, 0, ex);
      const warm = intent.warmth > 0.5;
      iris.addColorStop(0, "#03080b"); iris.addColorStop(0.28, "#03080b");
      iris.addColorStop(0.55, warm ? "#784929" : "#385b69");
      iris.addColorStop(0.85, warm ? "#b87d44" : "#779ead");
      iris.addColorStop(1, "#111c21");
      ctx.globalAlpha = Math.min(1, light + 0.12);
      ctx.fillStyle = iris; ctx.beginPath(); ctx.arc(0, 0, ex, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = warm ? "#ca9659" : "#8ba9b8"; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(0, 0, ex, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    const label = performance.phase === "intro" ? "despertando" : performance.phase === "sequence" ? "ressonância" : MOOD_LABELS[temperament.mood];
    if (label !== lastLabel) { lastLabel = label; options.onState(label); }
    canvas.dataset.ready = "true"; canvas.dataset.mood = temperament.mood;
    canvas.dataset.evolution = director.evolution > 0.9 ? "awakened" : "latent";
  }
  const loop = createFrameLoop(draw);
  loop.start();
  return {
    setSize(w, h) {
      width = Math.max(1, w); height = Math.max(1, h); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    setVisible: loop.setVisible,
    setReduced(value) { reduced = value; performance.setReduced(value); },
    pointer(x, y) {
      if (!present) { previous.x = x; previous.y = y; }
      pointer.x = x; pointer.y = y; present = true;
    },
    leave() { present = false; performance.hold(false); },
    hold(active) { performance.hold(active && Math.hypot(pointer.x * (width / height), pointer.y) < 0.75); },
    tap(x, y) { pointer.x = x; pointer.y = y; present = true; if (!reduced) contact = 0.4; },
    metamorphose: performance.metamorphose,
    dispose() { loop.dispose(); performance.dispose(); },
  };
}
