import { useEffect, useRef, useState } from "react";
import { FIELD_OF_VIEW, SCULPTURE_CONTEXT_OPTIONS, SculptureRenderer, type SculptureView } from "../graphics/sculptureRenderer";
import { SculptureMotion, type MotionInput } from "../graphics/sculptureMotion";
import { parseGlb, type SculptureModel } from "../utils/glb";
import { sampleSurface } from "../utils/surfaceSampling";
import "../styles/sculpture-stage.css";

const PARTICLE_COUNT = 16000;
const MIN_DISTANCE = 4.6;

type LoadedSculpture = { model: SculptureModel; particles: Float32Array };

// The opening and the passage show the same sculpture, so it is fetched and
// sampled once per page load.
const loaded = new Map<string, Promise<LoadedSculpture>>();

function loadSculpture(url: string): Promise<LoadedSculpture> {
  let pending = loaded.get(url);
  if (!pending) {
    pending = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`The sculpture responded with ${response.status}.`);
      const model = parseGlb(await response.arrayBuffer());
      return { model, particles: sampleSurface(model, PARTICLE_COUNT) };
    });
    loaded.set(url, pending);
    // A failed download should be retried by the next visit, not cached forever.
    pending.catch(() => loaded.delete(url));
  }
  return pending;
}

type Props = {
  model: string;
  poster: string;
  dissolve?: number;
  turn?: number;
  tilt?: number;
  burstKey?: number;
  paused: boolean;
  intro?: boolean;
  interactive?: boolean;
  energy?: number;
  composition: "hero" | "centered";
};

// Draws the Blender sculpture in WebGL2. The still image stays visible until
// the model is ready, and the page keeps working if WebGL2 is unavailable.
export function SculptureStage({ model, poster, dissolve = 0, turn = 0, tilt = 0, burstKey = 0, paused, intro = false, interactive = false, energy = 0, composition }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controls = useRef({ dissolve, turn, tilt, paused, interactive, energy, composition });
  const requestFrame = useRef<() => void>(() => {});
  const disperse = useRef<() => void>(() => {});
  const seenBurst = useRef(burstKey);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    controls.current = { dissolve, turn, tilt, paused, interactive, energy, composition };
    requestFrame.current();
  }, [dissolve, turn, tilt, paused, interactive, energy, composition]);

  useEffect(() => {
    if (burstKey === seenBurst.current) return;
    seenBurst.current = burstKey;
    disperse.current();
  }, [burstKey]);

  useEffect(() => {
    const wrapper = frameRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return;
    // Without WebGL2 the poster stays on screen and no listeners are attached.
    const context = canvas.getContext("webgl2", SCULPTURE_CONTEXT_OPTIONS);
    if (!context) return;
    const gl: WebGL2RenderingContext = context;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = new SculptureMotion({ intro });
    const pointer = { x: 0, y: 0, active: false, dragging: false, press: null as { x: number; y: number; moved: number } | null };
    let renderer: SculptureRenderer | null = null;
    let disposed = false;
    let visible = true;
    let frame = 0;
    let last = 0;
    let width = 0;
    let height = 0;

    function schedule() {
      if (!frame && !disposed) frame = requestAnimationFrame(tick);
    }
    requestFrame.current = schedule;
    disperse.current = () => { motion.disperse(); schedule(); };

    function resize() {
      const bounds = wrapper!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1800 / bounds.width);
      width = Math.max(1, Math.round(bounds.width * ratio));
      height = Math.max(1, Math.round(bounds.height * ratio));
      canvas!.width = width;
      canvas!.height = height;
      renderer?.resize(width, height);
      schedule();
    }

    function currentView(): SculptureView {
      const aspect = width / height;
      const distance = Math.max(MIN_DISTANCE, 1.05 / (Math.tan(FIELD_OF_VIEW / 2) * Math.min(aspect, 1)));
      const { composition: layout } = controls.current;
      const shift: [number, number] = layout === "hero" ? (aspect >= 0.85 ? [0.36, 0.02] : [0, 0.4]) : [0, 0];
      return { aspect, distance, shift };
    }

    function tick(now: number) {
      frame = 0;
      if (!renderer || disposed || !visible || document.hidden) return;
      const state = controls.current;
      const still = reduced.matches;
      const dt = still ? 5 : last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const input: MotionInput = {
        dt,
        paused: state.paused || still,
        dissolve: state.dissolve,
        turn: state.turn,
        tilt: state.tilt,
        pointer: { x: pointer.x, y: pointer.y, active: pointer.active && live() },
        energy: state.energy,
      };
      renderer.draw(motion.step(input), currentView());
      if (!still && (!input.paused || motion.isMoving())) schedule();
    }

    // Pointer input only counts while the sculpture is live: paused or reduced-motion scenes ignore it.
    const live = () => controls.current.interactive && !controls.current.paused && !reduced.matches;

    function onPointerMove(event: PointerEvent) {
      const bounds = canvas!.getBoundingClientRect();
      const over = event.target instanceof Element && event.target.closest("button, a, input, nav, label, dialog");
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
      const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      pointer.active = Boolean(live() && !over && inside);
      if (pointer.active) motion.touch(Math.min(0.35, Math.hypot(event.movementX, event.movementY) / 220));
      if (pointer.dragging) motion.spin(event.movementX * 0.0022);
      if (pointer.press) pointer.press.moved += Math.hypot(event.movementX, event.movementY);
      schedule();
    }

    function onPointerDown(event: PointerEvent) {
      const bounds = canvas!.getBoundingClientRect();
      const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      const over = event.target instanceof Element && event.target.closest("button, a, input, nav, label, dialog");
      pointer.dragging = Boolean(inside && !over && live());
      pointer.press = inside && !over ? { x: event.clientX, y: event.clientY, moved: 0 } : null;
    }

    function onPointerEnd(event: PointerEvent) {
      // A press that barely moves is a tap: the matter disperses.
      if (pointer.press && pointer.press.moved < 6 && live()) motion.disperse();
      pointer.press = null;
      pointer.dragging = false;
      if (event.pointerType !== "mouse") pointer.active = false;
      schedule();
    }

    function onWindowExit(event: PointerEvent) {
      if (!event.relatedTarget) pointer.active = false;
      schedule();
    }

    async function load() {
      const sculpture = await loadSculpture(model);
      if (disposed) return;
      renderer = SculptureRenderer.create(gl, sculpture.model, sculpture.particles);
      if (!renderer) return;
      resize();
      canvas!.dataset.ready = "true";
      schedule();
    }

    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    const resizer = new ResizeObserver(resize);
    const lost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      renderer = null;
      delete canvas!.dataset.ready;
    };
    const restored = () => setGeneration(value => value + 1);

    visibility.observe(wrapper);
    resizer.observe(wrapper);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerEnd, { passive: true });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true });
    window.addEventListener("pointerout", onWindowExit, { passive: true });
    document.addEventListener("visibilitychange", schedule);
    reduced.addEventListener("change", schedule);
    canvas.addEventListener("webglcontextlost", lost);
    canvas.addEventListener("webglcontextrestored", restored);

    load().catch(() => {
      // The poster remains visible when the model cannot be loaded.
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      visibility.disconnect();
      resizer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      window.removeEventListener("pointerout", onWindowExit);
      document.removeEventListener("visibilitychange", schedule);
      reduced.removeEventListener("change", schedule);
      canvas.removeEventListener("webglcontextlost", lost);
      canvas.removeEventListener("webglcontextrestored", restored);
      renderer?.dispose();
      delete canvas.dataset.ready;
      requestFrame.current = () => {};
      disperse.current = () => {};
    };
  }, [model, intro, generation]);

  return (
    <div ref={frameRef} className={`sculpture-stage sculpture-stage--${composition}`} aria-hidden="true">
      <img src={poster} alt="" fetchPriority="high" />
      <canvas ref={canvasRef} className="sculpture-canvas" />
    </div>
  );
}
