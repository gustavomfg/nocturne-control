import { useEffect, useRef } from "react";
import { createRandom } from "../../core/math";
import { watchReducedMotion } from "../../core/capabilities";
import { ENTITY } from "./config";

// Without WebGL2 the entity is drawn as a field of points on a 2D canvas. It keeps
// the same silhouette, the same open face, and the same reaction to the pointer.
const POINTS = 720;

type Point = { x: number; y: number; z: number; seed: number };

function fibonacciSphere(count: number, seed = 5): Point[] {
  const random = createRandom(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const y = 1 - (2 * (i + 0.5)) / count;
    const ring = Math.sqrt(1 - y * y);
    const theta = i * golden;
    const x = Math.cos(theta) * ring;
    const z = Math.sin(theta) * ring;
    // The open face: points in the cap facing the viewer are left out.
    if (z > Math.cos(ENTITY.aperture)) continue;
    points.push({ x, y, z, seed: random() });
  }
  return points;
}

export function EntityFallback() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const ctx: CanvasRenderingContext2D = context;

    const points = fibonacciSphere(POINTS);
    const pointer = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;
    let reduced = false;
    let size = 1;
    let elapsed = 0;
    let last = 0;
    let visible = true;

    function resize() {
      const bounds = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      size = Math.min(bounds.width, bounds.height);
      canvas!.width = Math.max(1, Math.round(bounds.width * dpr));
      canvas!.height = Math.max(1, Math.round(bounds.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(0);
    }

    function draw(dt: number) {
      const width = canvas!.clientWidth;
      const height = canvas!.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = size * 0.34;

      ctx.fillStyle = ENTITY.palette.void;
      ctx.fillRect(0, 0, width, height);

      current.x += (pointer.x - current.x) * (1 - Math.exp(-dt * 2));
      current.y += (pointer.y - current.y) * (1 - Math.exp(-dt * 2));
      const yaw = (reduced ? 0 : elapsed * 0.12) + current.x * 0.6;
      const pitch = current.y * 0.3;
      const cosYaw = Math.cos(yaw);
      const sinYaw = Math.sin(yaw);
      const cosPitch = Math.cos(pitch);
      const sinPitch = Math.sin(pitch);

      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 0.9);
      glow.addColorStop(0, "rgba(255, 161, 85, 0.55)");
      glow.addColorStop(0.35, "rgba(255, 161, 85, 0.18)");
      glow.addColorStop(1, "rgba(255, 161, 85, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      for (const point of points) {
        const x1 = point.x * cosYaw + point.z * sinYaw;
        const z1 = -point.x * sinYaw + point.z * cosYaw;
        const y2 = point.y * cosPitch - z1 * sinPitch;
        const z2 = point.y * sinPitch + z1 * cosPitch;
        const perspective = 3.4 / (3.4 - z2 * 0.9);
        const px = centerX + x1 * radius * perspective;
        const py = centerY + y2 * radius * perspective;
        const depth = (z2 + 1) / 2;
        const alpha = 0.1 + depth * 0.7;
        const warm = depth > 0.7 ? "255, 241, 220" : "255, 161, 85";
        ctx.fillStyle = `rgba(${warm}, ${alpha * (0.4 + point.seed * 0.6)})`;
        ctx.fillRect(px, py, 1.4 + point.seed * 1.2, 1.4 + point.seed * 1.2);
      }
    }

    function loop(now: number) {
      frame = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      elapsed += dt;
      draw(dt);
      if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(loop);
    }

    function restart() {
      cancelAnimationFrame(frame);
      frame = 0;
      last = 0;
      if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(loop);
      else draw(0);
    }

    const onPointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = 1 - ((event.clientY - bounds.top) / bounds.height) * 2;
      if (reduced) draw(0);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    const resizer = new ResizeObserver(resize);
    observer.observe(canvas);
    resizer.observe(canvas);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", restart);
    const stopReduced = watchReducedMotion((value) => {
      reduced = value;
      restart();
    });
    resize();
    restart();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizer.disconnect();
      stopReduced();
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", restart);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="entity-fallback"
      role="img"
      aria-label="Entidade digital abstrata, desenhada em pontos luminosos."
    />
  );
}
