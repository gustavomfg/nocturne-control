import { useEffect, useRef, useState } from "react";
import "../styles/particle-universe.css";

type Props = {
  mode: { accent: string };
  intensity: number;
  audioLevel: number;
  pulseKey: number;
  initialScene?: number;
  controls?: boolean;
  progression?: number;
  frozen?: boolean;
};

const scenes = ["Nebulosa", "Vórtice", "Onda"];
const TAU = Math.PI * 2;

// Each point has three stable destinations in world space. Morphing preserves
// particle identity, so an explosion always finds its way back to a shape.
function destination(index: number, count: number, scene: number) {
  const u = index / count;
  const a = index * 2.3999632297;
  if (scene === 0) {
    const y = 1 - u * 2;
    const radius = Math.sqrt(1 - y * y);
    const ripple = 1 + 0.12 * Math.sin(a * 3 + y * 8);
    return [Math.cos(a) * radius * ripple, y * ripple, Math.sin(a) * radius * ripple];
  }
  if (scene === 1) {
    // A torus knot, sampled along slender parallel filaments.
    const angle = u * TAU * 12;
    const strand = Math.floor(u * 12) / 12 * TAU;
    const radius = 0.68 + 0.28 * Math.cos(3 * angle) + 0.06 * Math.cos(strand);
    return [radius * Math.cos(2 * angle), 0.34 * Math.sin(3 * angle) + 0.06 * Math.sin(strand), radius * Math.sin(2 * angle)];
  }
  const side = Math.ceil(Math.sqrt(count));
  const x = (index % side) / side * 2 - 1;
  const z = Math.floor(index / side) / side * 2 - 1;
  return [x * 1.2, Math.sin(x * 4 + z * 3) * 0.26, z * 1.2];
}

export function ParticleUniverse({ mode, intensity, audioLevel, pulseKey, initialScene = 0, controls = true, progression, frozen = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(initialScene);
  const [paused, setPaused] = useState(false);
  const live = useRef({ accent: mode.accent, intensity, audioLevel, pulseKey, scene, paused: paused || frozen, progression });
  useEffect(() => { live.current = { accent: mode.accent, intensity, audioLevel, pulseKey, scene, paused: paused || frozen, progression }; }, [mode.accent, intensity, audioLevel, pulseKey, scene, paused, frozen, progression]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    canvas.dataset.ready = "true";
    const motion = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const count = window.innerWidth < 700 ? 1100 : 2800;
    const shapes = scenes.map((_, s) => Array.from({ length: count }, (_, i) => destination(i, count, s)));
    const points = shapes[initialScene].map(p => [...p]);
    const pointer = { x: 0, y: 0, active: false };
    let width = 1, height = 1, frame = 0, time = 0, last = 0;
    let visible = true, burst = 0, lastPulse = live.current.pulseKey;
    let lastScene = live.current.scene, lastAccent = live.current.accent, lastProgression = live.current.progression;

    function resize() {
      const box = canvas!.getBoundingClientRect();
      width = box.width; height = box.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.max(1, Math.round(width * dpr));
      canvas!.height = Math.max(1, Math.round(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    }

    function draw(dt: number) {
      const state = live.current;
      const still = motion?.matches || state.paused;
      if (!still) time += dt;
      if (lastPulse !== state.pulseKey) { if (!still) burst = 1; lastPulse = state.pulseKey; }
      burst *= Math.exp(-dt * 2.6);
      ctx!.fillStyle = "#090909";
      ctx!.fillRect(0, 0, width, height);
      const size = Math.min(width * 0.38, height * 0.36);
      const rotation = time * 0.11 + (still ? 0 : pointer.x * 0.2);
      const tilt = -0.38 + (still ? 0 : pointer.y * 0.15);
      const ca = Math.cos(rotation), sa = Math.sin(rotation), ct = Math.cos(tilt), st = Math.sin(tilt);
      const projected: { x: number; y: number; z: number; r: number; alpha: number }[] = [];
      const position = Math.max(0, Math.min(2, state.progression ?? state.scene));
      const from = Math.floor(position), to = Math.min(2, from + 1);
      const mix = position - from;
      const smoothMix = mix * mix * (3 - 2 * mix);
      for (let i = 0; i < count; i++) {
        const p = points[i];
        const blend = still ? 1 : 1 - Math.exp(-Math.max(dt, 0.016) * 3.2);
        for (let axis = 0; axis < 3; axis++) {
          const target = shapes[from][i][axis] * (1 - smoothMix) + shapes[to][i][axis] * smoothMix;
          p[axis] += (target - p[axis]) * blend;
        }
        const energy = 1 + burst * (0.5 + (i % 13) * 0.07) + state.audioLevel * 0.12;
        const ripple = still ? 0 : Math.sin(time * (0.5 + state.intensity) + i * 0.015) * (0.015 + 0.075 * state.intensity);
        const x = p[0] * energy, y = (p[1] + ripple) * energy, z = p[2] * energy;
        const rx = x * ca + z * sa, rz = z * ca - x * sa;
        const ry = y * ct - rz * st, depth = y * st + rz * ct;
        const perspective = 3.8 / (3.8 + depth);
        let sx = rx * size * perspective, sy = ry * size * perspective;
        if (pointer.active && !still) {
          const dx = sx - pointer.x * width * 0.5, dy = sy - pointer.y * height * 0.5;
          const distance = Math.hypot(dx, dy);
          const force = Math.max(0, 1 - distance / (size * 0.65));
          sx += dx * force * 0.55; sy += dy * force * 0.55;
        }
        projected.push({ x: width / 2 + sx, y: height / 2 + sy, z: depth, r: (i % 9 === 0 ? 1.5 : 0.85) * perspective, alpha: Math.max(0.13, Math.min(0.95, 0.55 - depth * 0.3)) });
      }
      // Reveal the knot's continuous filaments only as that form emerges.
      const filamentOpacity = Math.max(0, 1 - Math.abs(position - 1) * 2);
      if (filamentOpacity > 0) {
        ctx!.strokeStyle = state.accent;
        ctx!.globalAlpha = filamentOpacity * 0.16;
        ctx!.lineWidth = 0.6;
        ctx!.beginPath();
        for (let i = 1; i < projected.length; i++) {
          const a = projected[i - 1], b = projected[i];
          if (Math.hypot(a.x - b.x, a.y - b.y) < size * 0.13) {
            ctx!.moveTo(a.x, a.y); ctx!.lineTo(b.x, b.y);
          }
        }
        ctx!.stroke();
      }
      projected.sort((a, b) => b.z - a.z);
      ctx!.fillStyle = state.accent;
      for (const p of projected) {
        ctx!.globalAlpha = p.alpha;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.r, 0, TAU); ctx!.fill();
      }
      // A sparse, deterministic star field adds depth without a second animation.
      for (let i = 0; i < 85; i++) {
        ctx!.globalAlpha = 0.12 + (i % 4) * 0.05;
        ctx!.fillRect(((i * 137.51) % 997) / 997 * width, ((i * 73.79) % 991) / 991 * height, 1, 1);
      }
      ctx!.globalAlpha = 1;
      lastScene = state.scene; lastAccent = state.accent; lastProgression = state.progression;
    }

    function tick(now: number) {
      frame = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min((now - (last || now)) / 1000, 0.04);
      last = now;
      const state = live.current;
      if (!(motion?.matches || state.paused) || state.scene !== lastScene || state.accent !== lastAccent || state.progression !== lastProgression) draw(dt);
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    }
    function move(event: PointerEvent) {
      const box = canvas!.getBoundingClientRect();
      pointer.x = (event.clientX - box.left) / box.width * 2 - 1;
      pointer.y = (event.clientY - box.top) / box.height * 2 - 1;
      pointer.active = true;
    }
    function leave() { pointer.active = false; pointer.x = 0; pointer.y = 0; }
    function explode() { if (!motion?.matches && !live.current.paused) burst = 1; }
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); }) : null;
    const resizer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    observer?.observe(canvas); resizer?.observe(canvas);
    canvas.addEventListener("pointermove", move); canvas.addEventListener("pointerleave", leave); canvas.addEventListener("pointerdown", explode);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("resize", resize);
    resize(); resume();
    return () => {
      delete canvas.dataset.ready;
      cancelAnimationFrame(frame); observer?.disconnect(); resizer?.disconnect();
      canvas.removeEventListener("pointermove", move); canvas.removeEventListener("pointerleave", leave); canvas.removeEventListener("pointerdown", explode);
      document.removeEventListener("visibilitychange", resume); window.removeEventListener("resize", resize);
    };
  }, [initialScene]);

  return <div className="particle-universe">
    <div className="particle-universe__fallback" aria-hidden="true" />
    <canvas ref={canvasRef} className="solaris-canvas" aria-label={controls ? "Instrumento visual interativo" : `Estudo de partículas: ${scenes[initialScene]}`} />
    {controls && <div className="particle-controls" onPointerDown={event => event.stopPropagation()}>
      <div className="particle-scenes" role="group" aria-label="Forma da composição">
        {scenes.map((name, index) => <button type="button" key={name} aria-pressed={scene === index} onClick={() => setScene(index)}>{name}</button>)}
      </div>
      <button className="particle-pause" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Retomar movimento" : "Pausar movimento"}</button>
    </div>}
  </div>;
}
