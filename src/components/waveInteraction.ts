const MAX_PARTICLES = 650;
const TRAIL_COUNT = 8;
const TRAIL_LIFETIME = 0.72;
const TRAIL_SPACING = 20;
const EMISSION_SPACING = 4;

type Trail = { x: number; y: number; age: number; strength: number; radius: number };
type Mote = {
  x: number; y: number; originX: number; originY: number;
  vx: number; vy: number; age: number; life: number;
  size: number; alpha: number; r: number; g: number; b: number;
};
type Source = { data: Uint8ClampedArray; width: number; height: number; key: string };

const sourceCache = new WeakMap<HTMLImageElement, Source>();
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Cursor wake and spring-returning motes, all simulated in CSS pixels. */
export class WaveInteraction {
  private width = 1;
  private height = 1;
  private cropX = 1;
  private cropY = 1;
  private offsetX = 0;
  private offsetY = 0;
  private source: Source | null = null;
  private previous: { x: number; y: number; time: number } | null = null;
  private trailRemainder = 0;
  private emissionRemainder = 0;
  private history: Trail[] = [];
  private tip: Trail | null = null;
  private motes: Mote[] = [];
  private trailBuffer = new Float32Array(TRAIL_COUNT * 4);
  private particleBuffer = new Float32Array(MAX_PARTICLES * 7);
  private particlesDirty = false;

  resize(widthCss: number, heightCss: number) {
    if (!Number.isFinite(widthCss) || !Number.isFinite(heightCss) || widthCss <= 0 || heightCss <= 0) return;
    if (this.width !== widthCss || this.height !== heightCss) this.reset();
    this.width = widthCss;
    this.height = heightCss;
  }

  setSource(image: HTMLImageElement, cropX: number, cropY: number, offsetX: number, offsetY: number) {
    this.cropX = cropX;
    this.cropY = cropY;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    const key = `${image.currentSrc || image.src}:${image.naturalWidth}x${image.naturalHeight}`;
    const cached = sourceCache.get(image);
    if (cached?.key === key) { this.source = cached; return; }
    this.source = null;
    if (!image.naturalWidth || !image.naturalHeight) return;
    // Read back a small image once, never the animated WebGL canvas per frame.
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;
    try {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      this.source = { data: context.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height, key };
      sourceCache.set(image, this.source);
    } catch {
      // Cross-origin artwork still has the shader wake, without invented motes.
      this.source = null;
    }
  }

  move(xPx: number, yPx: number, timeMs: number) {
    if (![xPx, yPx, timeMs].every(Number.isFinite)) return;
    if (xPx < 0 || yPx < 0 || xPx > this.width || yPx > this.height) { this.leave(); return; }
    const previous = this.previous;
    this.previous = { x: xPx, y: yPx, time: timeMs };
    if (!previous || timeMs - previous.time > 240 || timeMs < previous.time) {
      this.trailRemainder = 0;
      this.emissionRemainder = 0;
      this.tip = { x: xPx, y: yPx, age: 0, strength: 0.6, radius: Math.min(88, Math.max(46, this.height * 0.074)) };
      return;
    }
    const dx = xPx - previous.x, dy = yPx - previous.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.35) return;
    const speed = Math.min(2200, distance / Math.max((timeMs - previous.time) / 1000, 1 / 120));
    const energy = clamp(speed / 1150, 0.12, 1);
    const radius = Math.min(88, Math.max(46, this.height * 0.074)) + energy * 15;
    const strength = 0.5 + energy * 0.5;
    this.tip = { x: xPx, y: yPx, age: 0, strength, radius };

    // Keep a continuous, evenly spaced path regardless of pointer event rate.
    for (let along = TRAIL_SPACING - this.trailRemainder; along <= distance; along += TRAIL_SPACING) {
      const ratio = along / distance;
      this.history.push({ x: previous.x + dx * ratio, y: previous.y + dy * ratio, age: 0, strength, radius });
      if (this.history.length >= TRAIL_COUNT) this.history.shift();
    }
    this.trailRemainder = (this.trailRemainder + distance) % TRAIL_SPACING;

    const directionX = dx / distance, directionY = dy / distance;
    // Limit work for a single coalesced event without joining distant entries.
    let batches = 0;
    for (let along = EMISSION_SPACING - this.emissionRemainder; along <= distance && batches < 100; along += EMISSION_SPACING) {
      const ratio = along / distance;
      const x = previous.x + dx * ratio, y = previous.y + dy * ratio;
      for (let candidate = 0; candidate < 4; candidate++) this.emit(x, y, directionX, directionY, energy, radius);
      batches++;
    }
    this.emissionRemainder = (this.emissionRemainder + distance) % EMISSION_SPACING;
  }

  leave() {
    this.previous = null;
    this.trailRemainder = 0;
    this.emissionRemainder = 0;
  }

  reset() {
    this.leave();
    this.history.length = 0;
    this.tip = null;
    this.motes.length = 0;
    this.trailBuffer.fill(0);
    this.particleBuffer.fill(0);
    this.particlesDirty = false;
  }

  step(dtSeconds: number) {
    if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) return;
    const dt = Math.min(dtSeconds, 0.05);
    if (this.tip) {
      this.tip.age += dt;
      if (this.tip.age >= TRAIL_LIFETIME) this.tip = null;
    }
    for (const trail of this.history) trail.age += dt;
    this.history = this.history.filter(trail => trail.age < TRAIL_LIFETIME);

    let alive = 0;
    for (const mote of this.motes) {
      mote.age += dt;
      if (mote.age >= mote.life) continue;
      // A short free flight opens the wave; a damped spring then repairs it.
      const spring = 16 + 58 * clamp((mote.age - 0.13) / 0.48, 0, 1);
      const damping = Math.exp(-dt * 7.6);
      mote.vx = (mote.vx + (mote.originX - mote.x) * spring * dt) * damping;
      mote.vy = (mote.vy + (mote.originY - mote.y) * spring * dt) * damping;
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      this.motes[alive++] = mote;
    }
    this.motes.length = alive;
    this.particlesDirty = true;
  }

  get trails(): Float32Array {
    this.trailBuffer.fill(0);
    const nodes = this.tip ? [this.tip, ...this.history.slice().reverse()] : this.history.slice().reverse();
    nodes.slice(0, TRAIL_COUNT).forEach((trail, index) => {
      const remaining = 1 - trail.age / TRAIL_LIFETIME;
      const base = index * 4;
      this.trailBuffer[base] = trail.x / this.width;
      this.trailBuffer[base + 1] = 1 - trail.y / this.height;
      this.trailBuffer[base + 2] = trail.strength * remaining * remaining;
      this.trailBuffer[base + 3] = trail.radius / this.height;
    });
    return this.trailBuffer;
  }

  get particles(): Float32Array {
    if (!this.particlesDirty) return this.particleBuffer;
    this.motes.forEach((mote, index) => {
      const base = index * 7;
      const fadeIn = Math.min(1, mote.age / 0.035);
      const fadeOut = clamp((mote.life - mote.age) / 0.38, 0, 1);
      this.particleBuffer[base] = mote.x / this.width * 2 - 1;
      this.particleBuffer[base + 1] = 1 - mote.y / this.height * 2;
      this.particleBuffer[base + 2] = mote.size;
      this.particleBuffer[base + 3] = mote.alpha * fadeIn * fadeOut;
      this.particleBuffer[base + 4] = mote.r;
      this.particleBuffer[base + 5] = mote.g;
      this.particleBuffer[base + 6] = mote.b;
    });
    this.particlesDirty = false;
    return this.particleBuffer;
  }

  get particleCount(): number { return this.motes.length; }

  private emit(x: number, y: number, dx: number, dy: number, energy: number, radius: number) {
    if (!this.source || this.motes.length >= MAX_PARTICLES) return;
    const side = Math.random() < 0.5 ? -1 : 1;
    const lateral = side * Math.random() * radius * 0.64;
    const along = (Math.random() - 0.5) * 16;
    const originX = x - dy * lateral + dx * along;
    const originY = y + dx * lateral + dy * along;
    if (originX < 0 || originY < 0 || originX >= this.width || originY >= this.height) return;

    // WebGL UVs point upward; ImageData rows point downward. Keep both crops identical.
    const u = originX / this.width * this.cropX + this.offsetX;
    const v = (1 - originY / this.height) * this.cropY + this.offsetY;
    const sx = Math.floor(clamp(u, 0, 0.999999) * this.source.width);
    const sy = Math.floor(clamp(1 - v, 0, 0.999999) * this.source.height);
    const pixel = (sy * this.source.width + sx) * 4;
    const r = this.source.data[pixel] / 255;
    const g = this.source.data[pixel + 1] / 255;
    const b = this.source.data[pixel + 2] / 255;
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    if (luminance < 0.105 || this.source.data[pixel + 3] < 128) return;
    const scatter = (170 + energy * 430) * (0.6 + Math.random() * 0.65);
    const drift = (45 + energy * 110) * (0.5 + Math.random());
    this.motes.push({
      x: originX, y: originY, originX, originY,
      vx: -dy * side * scatter + dx * drift,
      vy: dx * side * scatter + dy * drift - 12,
      age: 0, life: 1.14 + Math.random() * 0.36,
      size: (1 + Math.random() * 1.9) * (0.8 + luminance * 0.65),
      alpha: clamp(0.4 + luminance * 0.75, 0, 1),
      r: Math.min(1, r * 1.25 + 0.13),
      g: Math.min(1, g * 1.18 + 0.07),
      b: Math.min(1, b * 1.08 + 0.025),
    });
    this.particlesDirty = true;
  }
}
