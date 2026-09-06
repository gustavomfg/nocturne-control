import { useEffect, useRef, useState } from "react";
import { ParticleUniverse } from "./ParticleUniverse";

type Props = { mode: { accent: string }; intensity: number; audioLevel: number; pulseKey: number; initialScene?: number; controls?: boolean; progression?: number; frozen?: boolean };
const names = ["Nebulosa", "Vórtice", "Onda"];

// A continuous surface gives the filaments a volume to inhabit. Their three
// destinations share coordinates, so the sculpture can unfold without a cut.
const vertex = `
precision highp float;
attribute vec3 seed;
uniform float time, shape, intensity, pulse, ratio, pixelRatio, pass;
uniform vec2 pointer;
varying vec3 world, normal;
varying vec2 weave;
varying float glow;
const float PI = 3.14159265;
mat2 rotate(float a) { return mat2(cos(a), -sin(a), sin(a), cos(a)); }
vec3 sculpture(vec2 uv) {
  float a = uv.x * PI * 2.0;
  float v = uv.y - 0.5;
  float breath = time * 0.075;
  float fold = a * 1.5 + 0.5 + sin(breath) * 0.15;
  float pleat = sin(v * 14.0 + a * 3.0) * 0.010;
  float width = v * (0.64 + 0.12 * sin(a * 3.0)) + pleat;
  float radius = 0.92 + 0.20 * cos(a * 3.0);
  vec3 center = vec3(radius * cos(a * 2.0), radius * sin(a * 2.0), 0.32 * sin(a * 3.0));
  vec3 across = vec3(cos(a * 2.0) * cos(fold), sin(a * 2.0) * cos(fold), sin(fold));
  vec3 nebula = center + across * width;
  nebula.yz = rotate(0.56) * nebula.yz;
  nebula.xy = rotate(-0.43) * nebula.xy;
  float spiral = a * 1.27 - 0.65;
  float r = 0.18 + pow(uv.x, 0.74) * 1.20;
  float sheet = v * (0.025 + pow(max(sin(uv.x * PI), 0.0), 0.72) * 0.72);
  vec3 vortex = vec3((r + sheet) * cos(spiral), (r + sheet) * sin(spiral), sin(a * 1.5) * 0.29 + sheet * sin(a * 2.0 + breath));
  vortex.yz = rotate(0.44) * vortex.yz;
  vortex.xy = rotate(-0.26) * vortex.xy;
  float x = (uv.x - 0.5) * 2.9;
  float z = v * 1.72;
  vec3 wave = vec3(x, sin(x * 2.2 + z * 2.5 + breath) * 0.35 + cos(z * 4.0 - breath) * 0.13, z);
  wave.yz = rotate(0.78) * wave.yz;
  wave.xy = rotate(-0.36) * wave.xy;
  float phase = clamp(shape, 0.0, 2.0);
  float blend = smoothstep(0.0, 1.0, fract(min(phase, 1.99999)));
  vec3 p = phase < 1.0 ? mix(nebula, vortex, blend) : mix(vortex, wave, phase >= 2.0 ? 1.0 : blend);
  p.xz = rotate(sin(breath * 0.53) * 0.18 + pointer.x * 0.18) * p.xz;
  p.yz = rotate(pointer.y * 0.12) * p.yz;
  return p;
}
void main() {
  weave = seed.xy;
  vec3 p = sculpture(seed.xy);
  vec3 tangent = sculpture(seed.xy + vec2(0.001, 0.0)) - p;
  vec3 across = sculpture(seed.xy + vec2(0.0, 0.001)) - p;
  normal = normalize(cross(tangent, across));
  float dust = 0.0;
  if (pass > 0.5) {
    p += normal * (0.009 + seed.z * seed.z * 0.034);
    p += normal * sin(seed.x * 65.0 + time * 0.22) * intensity * 0.015;
    dust = smoothstep(0.87, 0.98, seed.z);
    p *= 1.0 + dust * (0.1 + seed.y * 0.55);
    p.z += dust * sin(seed.x * 93.0) * 0.6;
  }
  p *= 1.0 + pulse * (0.22 + (pass > 0.5 ? seed.z * 0.72 : 0.0));
  world = p;
  float perspective = 4.4 / (4.4 + p.z);
  float fit = min(1.0, ratio * 1.06);
  float framing = 0.68 - sin(clamp(shape, 0.0, 2.0) * PI * 0.5) * 0.07;
  vec2 screen = p.xy * perspective * framing * fit;
  screen.x /= ratio;
  gl_Position = vec4(screen, p.z * 0.12, 1.0);
  float brilliance = pow(1.0 - abs(seed.y - 0.5) * 2.0, 2.0);
  gl_PointSize = (0.8 + seed.z * 0.75 + dust * 0.8) * pixelRatio * perspective;
  glow = (0.12 + brilliance * 0.27) * (1.0 - dust * 0.60);
}
`;

const fragment = `
precision highp float;
uniform vec3 accent;
uniform float pass, pulse;
varying vec3 world, normal;
varying vec2 weave;
varying float glow;
void main() {
  vec3 n = normalize(normal);
  if (!gl_FrontFacing) n = -n;
  vec3 view = normalize(vec3(0.0, 0.0, -4.4) - world);
  if (dot(n, view) < 0.0) n = -n;
  vec3 light = normalize(vec3(-0.45, 0.80, -1.35));
  float diffuse = max(dot(n, light), 0.0);
  float rim = pow(1.0 - max(dot(n, view), 0.0), 2.4);
  float specular = pow(max(dot(n, normalize(light + view)), 0.0), 12.0);
  float broad = pow(max(dot(n, normalize(vec3(0.7, -0.2, -0.7) + view)), 0.0), 7.0);
  float thread = pow(0.5 + 0.5 * sin(weave.y * 640.0 + sin(weave.x * 38.0) * 1.8), 3.0);
  float filigree = 0.85 + 0.15 * sin(weave.y * 310.0 + weave.x * 9.0);
  float edge = smoothstep(0.33, 0.5, abs(weave.y - 0.5));
  vec3 bronze = vec3(0.22, 0.103, 0.046);
  vec3 ivory = vec3(1.0, 0.90, 0.72);
  vec3 palette = mix(vec3(1.0), accent / max(max(accent.r, accent.g), max(accent.b, 0.001)), 0.19);
  vec3 color = bronze * (0.33 + diffuse * 0.76) * (0.58 + thread * 0.42);
  color += vec3(0.82, 0.62, 0.38) * broad * 0.95 * filigree;
  color += ivory * (specular * 3.1 + rim * 0.70 + pow(diffuse, 3.0) * 0.18) * (0.80 + thread * 0.20);
  color += ivory * edge * (0.06 + diffuse * 0.13);
  color *= mix(1.12, 0.55, smoothstep(-0.5, 0.85, world.z));
  color *= palette;
  if (pass > 0.5) {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float beam = exp(-d * d * 3.8);
    vec3 pointColor = mix(vec3(0.62, 0.31, 0.10), ivory, clamp(diffuse * 0.65 + specular + rim, 0.0, 1.0));
    gl_FragColor = vec4(pointColor * palette * (1.0 + pulse * 0.7), beam * glow * (0.8 + specular + rim));
  } else {
    color = color / (0.76 + color) * 1.24;
    gl_FragColor = vec4(color, 1.0);
  }
}
`;

const backdropVertex = `
attribute vec2 position;
varying vec2 uv;
void main() { uv = position; gl_Position = vec4(position, 0.99, 1.0); }
`;
const backdropFragment = `
precision mediump float;
varying vec2 uv;
uniform float ratio;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 p = uv * vec2(ratio, 1.0);
  float haze = exp(-dot(p * vec2(0.85, 1.12), p * vec2(0.85, 1.12)) * 2.3);
  float warmth = exp(-length(p - vec2(0.38, -0.30)) * 2.9);
  vec3 color = vec3(0.018, 0.019, 0.020) + haze * vec3(0.017, 0.016, 0.012) + warmth * vec3(0.025, 0.010, 0.002);
  vec2 grid = p * 115.0;
  vec2 cell = floor(grid);
  float star = step(0.998, hash(cell)) * pow(max(0.0, 1.0 - length(fract(grid) - 0.5) * 2.0), 4.0);
  color += star * 0.17 * vec3(0.8, 0.68, 0.46);
  color += (hash(gl_FragCoord.xy) - 0.5) * 0.006;
  gl_FragColor = vec4(color, 1.0);
}
`;

export function CinematicField(props: Props) {
  const { mode, intensity, audioLevel, pulseKey, initialScene = 0, controls = true, progression, frozen = false } = props;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState(initialScene);
  const [paused, setPaused] = useState(false);
  const [fallback, setFallback] = useState(false);
  const state = useRef({ accent: mode.accent, intensity, audioLevel, pulseKey, shape: progression ?? scene, paused: paused || frozen });
  useEffect(() => { state.current = { accent: mode.accent, intensity, audioLevel, pulseKey, shape: progression ?? scene, paused: paused || frozen }; }, [mode.accent, intensity, audioLevel, pulseKey, progression, scene, paused, frozen]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || fallback) return;
    const gl = el.getContext("webgl", { alpha: false, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    if (!gl) { setFallback(true); return; }
    const shaders: WebGLShader[] = [];
    const programs: WebGLProgram[] = [];
    const buffers: WebGLBuffer[] = [];
    const release = () => {
      buffers.forEach(buffer => gl.deleteBuffer(buffer));
      programs.forEach(program => gl.deleteProgram(program));
      shaders.forEach(shader => gl.deleteShader(shader));
    };
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const link = (vertexSource: string, fragmentSource: string) => {
      const vs = compile(gl.VERTEX_SHADER, vertexSource);
      const fs = compile(gl.FRAGMENT_SHADER, fragmentSource);
      if (!vs || !fs) return null;
      const program = gl.createProgram();
      if (!program) return null;
      programs.push(program);
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
    };
    const program = link(vertex, fragment);
    const backdrop = link(backdropVertex, backdropFragment);
    if (!program || !backdrop) { release(); setFallback(true); return; }
    const compact = window.innerWidth < 700;
    const rows = compact ? 260 : 440;
    const columns = compact ? 38 : 64;
    const surface = new Float32Array((rows + 1) * (columns + 1) * 3);
    const indices = new Uint16Array(rows * columns * 6);
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        const offset = (row * (columns + 1) + column) * 3;
        surface[offset] = row / rows;
        surface[offset + 1] = column / columns;
      }
    }
    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const first = row * (columns + 1) + column;
        indices.set([first, first + 1, first + columns + 1, first + 1, first + columns + 2, first + columns + 1], index);
        index += 6;
      }
    }
    const count = compact ? 8500 : 22000;
    const particles = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      particles[i * 3] = (i * 0.61803398875) % 1;
      particles[i * 3 + 1] = (i * 0.754877666) % 1;
      particles[i * 3 + 2] = (i * 0.569840291) % 1;
    }
    const upload = (target: number, data: Float32Array | Uint16Array) => {
      const buffer = gl.createBuffer();
      if (!buffer) return null;
      buffers.push(buffer);
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, data, gl.STATIC_DRAW);
      return buffer;
    };
    const surfaceBuffer = upload(gl.ARRAY_BUFFER, surface);
    const indexBuffer = upload(gl.ELEMENT_ARRAY_BUFFER, indices);
    const particleBuffer = upload(gl.ARRAY_BUFFER, particles);
    const backgroundBuffer = upload(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]));
    if (!surfaceBuffer || !indexBuffer || !particleBuffer || !backgroundBuffer) { release(); setFallback(true); return; }
    const seed = gl.getAttribLocation(program, "seed");
    const position = gl.getAttribLocation(backdrop, "position");
    const backgroundRatio = gl.getUniformLocation(backdrop, "ratio");
    const uniforms = Object.fromEntries(["time", "shape", "intensity", "pulse", "ratio", "pixelRatio", "pointer", "accent", "pass"].map(key => [key, gl.getUniformLocation(program, key)]));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, visible = true, time = 0, last = 0, burst = 0;
    let lastPulse = state.current.pulseKey, currentShape = state.current.shape, dirty = true, dpr = 1;
    let previousAccent = "", previousShape = -1, previousIntensity = -1;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = () => {
      const box = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75);
      el.width = Math.max(1, Math.round(box.width * dpr));
      el.height = Math.max(1, Math.round(box.height * dpr));
      gl.viewport(0, 0, el.width, el.height);
      dirty = true;
    };
    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) return;
      const dt = Math.min((now - (last || now)) / 1000, 0.04);
      last = now;
      const s = state.current;
      const still = s.paused || reduced.matches;
      if (!still) {
        time += dt;
        currentShape += (s.shape - currentShape) * (1 - Math.exp(-dt * 3));
        pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 5));
        pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 5));
        burst *= Math.exp(-dt * 2.2);
      } else if (s.shape !== previousShape) currentShape = s.shape;
      if (lastPulse !== s.pulseKey) { if (!still) burst = 1; lastPulse = s.pulseKey; }
      if (!still || dirty || s.accent !== previousAccent || s.shape !== previousShape || s.intensity !== previousIntensity) {
        gl.disable(gl.BLEND);
        gl.disable(gl.DEPTH_TEST);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(backdrop);
        gl.bindBuffer(gl.ARRAY_BUFFER, backgroundBuffer);
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(backgroundRatio, el.width / el.height);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.disableVertexAttribArray(position);
        gl.useProgram(program);
        const hex = parseInt(s.accent.slice(1), 16);
        gl.uniform3f(uniforms.accent, ((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
        gl.uniform1f(uniforms.time, time);
        gl.uniform1f(uniforms.shape, currentShape);
        gl.uniform1f(uniforms.intensity, s.intensity + s.audioLevel * 0.3);
        gl.uniform1f(uniforms.pulse, burst);
        gl.uniform1f(uniforms.ratio, el.width / el.height);
        gl.uniform1f(uniforms.pixelRatio, dpr);
        gl.uniform2f(uniforms.pointer, pointer.x, pointer.y);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enableVertexAttribArray(seed);
        gl.bindBuffer(gl.ARRAY_BUFFER, surfaceBuffer);
        gl.vertexAttribPointer(seed, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.uniform1f(uniforms.pass, 0);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.vertexAttribPointer(seed, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uniforms.pass, 1);
        gl.drawArrays(gl.POINTS, 0, count);
        gl.disableVertexAttribArray(seed);
        previousAccent = s.accent;
        previousShape = s.shape;
        previousIntensity = s.intensity;
        dirty = false;
        el.dataset.ready = "true";
      }
      frame = requestAnimationFrame(draw);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      last = 0;
      dirty = true;
      if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    };
    const move = (event: PointerEvent) => {
      const box = el.getBoundingClientRect();
      pointer.tx = (event.clientX - box.left) / box.width * 2 - 1;
      pointer.ty = 1 - (event.clientY - box.top) / box.height * 2;
    };
    const leave = () => { pointer.tx = 0; pointer.ty = 0; };
    const scatter = () => { if (!state.current.paused && !reduced.matches) burst = 1; };
    const loss = (event: Event) => { event.preventDefault(); setFallback(true); };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); });
    const resizer = new ResizeObserver(resize);
    observer.observe(el);
    resizer.observe(el);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", scatter);
    el.addEventListener("webglcontextlost", loss);
    document.addEventListener("visibilitychange", resume);
    reduced.addEventListener("change", resume);
    resize();
    resume();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizer.disconnect();
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("pointerdown", scatter);
      el.removeEventListener("webglcontextlost", loss);
      document.removeEventListener("visibilitychange", resume);
      reduced.removeEventListener("change", resume);
      release();
    };
  }, [fallback, initialScene]);

  if (fallback) return <ParticleUniverse {...props} />;
  return <div className="particle-universe cinematic-field">
    <canvas ref={canvas} className="solaris-canvas" aria-label={controls ? "Instrumento visual interativo" : "Escultura de luz tridimensional"} />
    {controls && <div className="particle-controls" onPointerDown={event => event.stopPropagation()}>
      <div className="particle-scenes" role="group" aria-label="Forma da escultura">{names.map((name, index) => <button key={name} type="button" aria-pressed={scene === index} onClick={() => setScene(index)}>{name}</button>)}</div>
      <button className="particle-pause" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Retomar movimento" : "Pausar movimento"}</button>
    </div>}
  </div>;
}
