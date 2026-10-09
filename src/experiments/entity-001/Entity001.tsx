import { useEffect, useRef, useState } from "react";
import { createAmbience } from "../../core/audio";
import { supportsWebGL2, watchReducedMotion } from "../../core/capabilities";
import { createFallbackScene } from "./EntityFallback";
import { createEntityScene, type EntityScene, type SceneOptions } from "./scene";
import "./entity-001.css";

const DOUBLE_TAP_MS = 380;
const DOUBLE_TAP_REACH = 0.12;
const HINT_DELAY_MS = 18000;
type Mode = "webgl" | "fallback";

export default function Entity001() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EntityScene | null>(null);
  const [mode, setMode] = useState<Mode>(() => supportsWebGL2() ? "webgl" : "fallback");
  const [label, setLabel] = useState(() => mode === "webgl" ? "despertando" : "modo essencial");
  const [sequence, setSequence] = useState(false);
  const [sound, setSound] = useState(false);
  const [soundPending, setSoundPending] = useState(false);
  const [hint, setHint] = useState(false);
  const [ambience] = useState(createAmbience);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; ambience.dispose(); };
  }, [ambience]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const canvas = document.createElement("canvas");
    canvas.className = mode === "webgl" ? "entity-canvas" : "entity-fallback";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Entidade digital abstrata: máscara de metal vivo com um olhar âmbar.");
    stage.prepend(canvas);
    let reduced = false;
    const stopReduced = watchReducedMotion(value => {
      reduced = value; sceneRef.current?.setReduced(value);
    });
    const options: SceneOptions = {
      canvas, compact: typeof window.matchMedia === "function" && window.matchMedia("(max-width: 700px)").matches, reduced,
      onState: setLabel,
      onEnergy: ambience.setEnergy,
      onCue: ambience.pulse,
      onSequence(active) {
        setSequence(active);
        if (active) { setHint(false); ambience.pulse(); }
      },
      onContextLost() {
        setLabel("modo essencial"); setSequence(false); setMode("fallback");
      },
    };
    let scene: EntityScene;
    try {
      scene = mode === "webgl" ? createEntityScene(options) : createFallbackScene(options);
    } catch {
      stopReduced(); canvas.remove();
      queueMicrotask(() => {
        if (mounted.current) { setLabel("modo essencial"); setMode("fallback"); }
      });
      return;
    }
    sceneRef.current = scene;
    let inView = true;
    const resize = () => {
      const width = stage.clientWidth, height = stage.clientHeight;
      const hasArea = width > 0 && height > 0;
      scene.setVisible(inView && hasArea);
      canvas.dataset.visible = String(inView && hasArea);
      if (hasArea) scene.setSize(width, height);
    };
    const resizer = new ResizeObserver(resize);
    resizer.observe(stage); resize();
    const visibility = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio > 0;
      resize();
    });
    visibility.observe(stage);
    let lastTap = { time: -1000, x: 0, y: 0 };
    let activity = performance.now();
    let hintTimer = 0;
    const checkHint = () => {
      const remaining = HINT_DELAY_MS - (performance.now() - activity);
      if (remaining <= 0 && !document.hidden) setHint(true);
      else hintTimer = window.setTimeout(checkHint, Math.max(1000, remaining));
    };
    hintTimer = window.setTimeout(checkHint, HINT_DELAY_MS);
    const awaken = () => {
      activity = performance.now(); setHint(false);
      window.clearTimeout(hintTimer);
      hintTimer = window.setTimeout(checkHint, HINT_DELAY_MS);
    };
    const toNdc = (event: PointerEvent) => {
      const bounds = stage.getBoundingClientRect();
      return { x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
        y: 1 - ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 };
    };
    const onMove = (event: PointerEvent) => {
      const p = toNdc(event); scene.pointer(p.x, p.y); awaken();
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const p = toNdc(event);
      scene.pointer(p.x, p.y);
      const now = performance.now();
      const close = Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < DOUBLE_TAP_REACH;
      if (now - lastTap.time < DOUBLE_TAP_MS && close) {
        scene.hold(false); scene.metamorphose();
        lastTap.time = -1000;
      } else {
        lastTap = { time: now, ...p }; scene.tap(p.x, p.y); scene.hold(true);
      }
      awaken();
    };
    const release = () => scene.hold(false);
    const leave = () => { scene.leave(); release(); };
    const onVisibility = () => {
      if (document.hidden) { release(); ambience.setEnergy(0); }
    };
    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerdown", onDown, { passive: true });
    stage.addEventListener("pointerleave", leave, { passive: true });
    window.addEventListener("pointerup", release, { passive: true });
    window.addEventListener("pointercancel", release, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      sceneRef.current = null;
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(hintTimer);
      resizer.disconnect(); visibility.disconnect(); stopReduced();
      scene.dispose(); canvas.remove();
    };
  }, [mode, ambience]);

  const toggleSound = async () => {
    if (soundPending) return;
    if (sound) { ambience.stop(); setSound(false); return; }
    setSoundPending(true);
    const started = await ambience.start();
    if (mounted.current) { setSound(started); setSoundPending(false); }
  };
  return (
    <section className="entity-experiment" aria-label="ENTITY 001 — AWAKENING">
      <div className="entity-stage" ref={stageRef} />
      <div className="entity-caption">
        <h1 className="entity-name">ENTITY 001 <span>— AWAKENING</span></h1>
        <p className="entity-readout" aria-live="polite"><span className="entity-state-dot" aria-hidden="true" />{label}</p>
      </div>
      <p className={`entity-hint${hint && !sequence ? " is-visible" : ""}`} aria-hidden={!hint || sequence}>Segure para despertar</p>
      <div className="entity-controls">
        <button type="button" aria-pressed={sound} aria-label={sound ? "Desativar som" : "Ativar som"}
          disabled={soundPending} onClick={() => void toggleSound()}>som <span aria-hidden="true">{sound ? "on" : "off"}</span></button>
        <button type="button" onClick={() => sceneRef.current?.metamorphose()}
          disabled={sequence || label === "despertando"}>metamorfose</button>
      </div>
    </section>
  );
}
