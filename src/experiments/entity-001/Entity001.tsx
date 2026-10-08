import { useEffect, useRef, useState } from "react";
import { createAmbience } from "../../core/audio";
import { supportsWebGL2, watchReducedMotion } from "../../core/capabilities";
import { EntityFallback } from "./EntityFallback";
import { createEntityScene, type EntityScene } from "./scene";
import "./entity-001.css";

// Two taps closer than this in time and space count as a double tap.
const DOUBLE_TAP_MS = 380;
const DOUBLE_TAP_REACH = 0.12;
// After this long without the visitor moving, the entity asks for attention.
const HINT_DELAY_MS = 9000;

type Mode = "webgl" | "fallback";

// Without the renderer there is no behavior to report, so the readout says so.
const ESSENTIAL_LABEL = "modo essencial";

// ENTITY 001: a digital entity assembled from shards. This component only wires
// the DOM to the scene: pointer, size, visibility, motion preference and overlay.
export default function Entity001() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EntityScene | null>(null);
  const [mode, setMode] = useState<Mode>(() => (supportsWebGL2() ? "webgl" : "fallback"));
  const [label, setLabel] = useState(() => (mode === "webgl" ? "emergindo" : ESSENTIAL_LABEL));
  const [sequence, setSequence] = useState(false);
  const [sound, setSound] = useState(false);
  const [hint, setHint] = useState(false);
  const [ambience] = useState(createAmbience);

  useEffect(() => () => ambience.dispose(), [ambience]);

  useEffect(() => {
    if (mode !== "webgl") return;
    const stage = stageRef.current;
    if (!stage) return;

    const canvas = document.createElement("canvas");
    canvas.className = "entity-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Entidade digital abstrata, formada por estilhaços metálicos.");
    stage.prepend(canvas);

    let reduced = false;
    const stopReduced = watchReducedMotion((value) => {
      reduced = value;
      sceneRef.current?.setReduced(value);
    });
    const compact = window.matchMedia("(max-width: 700px)").matches;

    let scene: EntityScene;
    try {
      scene = createEntityScene({
        canvas,
        compact,
        reduced,
        onState: setLabel,
        onSequence: (active) => {
          setSequence(active);
          if (active) ambience.pulse();
        },
        onContextLost: () => {
          setLabel(ESSENTIAL_LABEL);
          setMode("fallback");
        },
      });
    } catch {
      stopReduced();
      canvas.remove();
      // Reported after the effect body, so React is not asked to render synchronously from it.
      queueMicrotask(() => {
        setLabel(ESSENTIAL_LABEL);
        setMode("fallback");
      });
      return;
    }
    sceneRef.current = scene;

    const resize = () => scene.setSize(stage.clientWidth, stage.clientHeight);
    const resizer = new ResizeObserver(resize);
    resizer.observe(stage);
    const visibility = new IntersectionObserver(([entry]) => scene.setVisible(entry.isIntersecting));
    visibility.observe(stage);

    const toNdc = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      return {
        x: ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        y: 1 - ((event.clientY - bounds.top) / bounds.height) * 2,
      };
    };
    const isControl = (event: PointerEvent) => event.target instanceof Element && Boolean(event.target.closest("button, a"));
    let lastTap = { time: 0, x: 0, y: 0 };
    let energy = 0;
    let hintTimer = window.setTimeout(() => setHint(true), HINT_DELAY_MS);
    const awaken = () => {
      setHint(false);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(() => setHint(true), HINT_DELAY_MS);
    };

    const onMove = (event: PointerEvent) => {
      const point = toNdc(event);
      scene.pointer(point.x, point.y);
      energy = Math.min(1, energy + Math.hypot(event.movementX, event.movementY) / 320);
      awaken();
    };
    const onDown = (event: PointerEvent) => {
      if (isControl(event)) return;
      const point = toNdc(event);
      const now = performance.now();
      const close = Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < DOUBLE_TAP_REACH;
      if (now - lastTap.time < DOUBLE_TAP_MS && close) {
        scene.metamorphose();
        lastTap = { time: 0, x: 0, y: 0 };
      } else {
        lastTap = { time: now, x: point.x, y: point.y };
        scene.tap(point.x, point.y);
      }
      awaken();
    };
    const onOut = (event: PointerEvent) => {
      if (!event.relatedTarget) scene.leave();
    };
    const drone = window.setInterval(() => {
      energy *= 0.9;
      ambience.setEnergy(energy);
    }, 200);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });

    return () => {
      sceneRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerout", onOut);
      window.clearTimeout(hintTimer);
      window.clearInterval(drone);
      resizer.disconnect();
      visibility.disconnect();
      stopReduced();
      scene.dispose();
      canvas.remove();
    };
  }, [mode, ambience]);

  const toggleSound = async () => {
    if (sound) {
      ambience.stop();
      setSound(false);
      return;
    }
    const started = await ambience.start();
    setSound(started);
  };

  const requestSequence = () => {
    sceneRef.current?.metamorphose();
  };

  return (
    <section className="entity-experiment" aria-label="ENTITY 001">
      <div className="entity-stage" ref={stageRef}>
        {mode === "fallback" && <EntityFallback />}
      </div>

      <p className="entity-readout" aria-live="polite">
        <span>estado</span> {label}
      </p>
      <p className={`entity-hint${hint ? " is-visible" : ""}`} aria-hidden={!hint}>
        Toque duas vezes
      </p>

      <div className="entity-controls">
        <button type="button" aria-pressed={sound} onClick={() => void toggleSound()}>
          som
        </button>
        <button type="button" onClick={requestSequence} disabled={sequence || mode === "fallback"}>
          metamorfose
        </button>
      </div>
    </section>
  );
}
