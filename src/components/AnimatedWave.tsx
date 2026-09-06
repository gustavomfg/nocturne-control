import { useEffect, useRef, useState } from "react";
import { WaveInteraction } from "./waveInteraction";

const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
uniform sampler2D artwork;
uniform vec2 crop;
uniform vec2 offset;
uniform vec2 pointer;
uniform float time;
uniform float motion;
uniform float aspect;
uniform vec4 trails[8];
varying vec2 uv;

void main() {
  vec2 source = uv * crop + offset;
  // The flow is authored in image coordinates, so the crest remains the same
  // subject even when the mobile composition crops the texture differently.
  vec2 center = vec2(0.64, 0.52);
  vec2 delta = source - center;
  float radius = length(delta);
  float phase = time * 0.48;
  float crest = exp(-dot(delta * vec2(1.1, 0.8), delta * vec2(1.1, 0.8)) * 4.0);
  float curl = (sin(phase + radius * 5.0) - sin(radius * 5.0)) * 0.095 * crest;
  vec2 spun = mat2(cos(curl), -sin(curl), sin(curl), cos(curl)) * delta;
  vec2 flow = spun - delta;
  flow.x += (sin(source.y * 10.0 + phase) - sin(source.y * 10.0)) * 0.014;
  flow.y += (sin(source.x * 11.0 - phase * 0.8) - sin(source.x * 11.0)) * 0.017;
  flow.y += (sin(source.x * 24.0 + source.y * 9.0 + phase * 1.6) - sin(source.x * 24.0 + source.y * 9.0)) * 0.003;
  flow += pointer * vec2(0.009, 0.006) * crest;
  vec2 edge = smoothstep(vec2(0.0), vec2(0.09), source) * smoothstep(vec2(0.0), vec2(0.09), 1.0-source);
  vec2 repel = vec2(0.0);
  float wake = 0.0;
  float rim = 0.0;
  float totalInfluence = 0.0;
  for (int i = 0; i < 8; i++) {
    vec2 distance = (uv - trails[i].xy) * vec2(aspect, 1.0);
    float radius = max(trails[i].w, 0.001);
    float normalizedDistance = length(distance) / radius;
    float influence = exp(-normalizedDistance * normalizedDistance * 2.2) * trails[i].z;
    totalInfluence += influence;
    vec2 direction = distance / max(length(distance), 0.002);
    repel -= direction / vec2(aspect, 1.0) * radius * influence * 0.58;
    wake = max(wake, influence);
    rim = max(rim, exp(-pow((normalizedDistance - 0.75) * 5.0, 2.0)) * trails[i].z);
  }
  repel /= max(1.0, totalInfluence * 0.7);
  vec2 displaced = clamp(source + (flow * edge.x * edge.y + repel * crop) * motion, vec2(0.001), vec2(0.999));
  vec3 color = texture2D(artwork, displaced).rgb;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // A quiet travelling highlight follows the bright fibers, never the black.
  float shimmer = sin(source.x * 17.0 + source.y * 9.0 - phase * 1.4) * 0.045;
  color *= 1.0 + shimmer * smoothstep(0.12, 0.7, luminance) * motion;
  // A porous opening follows the gesture; loose fibers are rendered as motes
  // in a separate pass, then the underlying material closes behind the cursor.
  float grain = fract(sin(dot(floor(gl_FragCoord.xy / 2.0), vec2(12.9898, 78.233))) * 43758.5453);
  float opening = smoothstep(0.12 + grain * 0.15, 0.86, wake) * motion;
  color = mix(color, vec3(0.0353), opening * 0.96);
  color += vec3(0.30, 0.18, 0.07) * rim * luminance * motion * 0.38;
  gl_FragColor = vec4(color, 1.0);
}`;

const particleVertexSource = `
attribute vec2 position;
attribute float size;
attribute float alpha;
attribute vec3 color;
uniform float pixelRatio;
varying float opacity;
varying vec3 tint;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
  gl_PointSize = max(1.0, size * pixelRatio);
  opacity = alpha;
  tint = color;
}`;
const particleFragmentSource = `
precision mediump float;
varying float opacity;
varying vec3 tint;
void main() {
  float radius = length(gl_PointCoord - 0.5) * 2.0;
  float glow = exp(-radius * radius * 3.8);
  gl_FragColor = vec4(tint * 1.35, glow * opacity);
}`;

export function AnimatedWave({ src, paused }: { src: string; paused: boolean }) {
  const image = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const refresh = useRef<(() => void) | null>(null);
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    pausedRef.current = paused;
    refresh.current?.();
  }, [paused]);

  useEffect(() => {
    const element = canvas.current, original = image.current;
    if (!element || !original) return;
    const gl = element.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true, powerPreference: "low-power" });
    if (!gl) return;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
      gl.deleteShader(shader); return null;
    };
    const vertex = compile(gl.VERTEX_SHADER, vertexSource), fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); return;
    }
    const buffer = gl.createBuffer(), texture = gl.createTexture();
    if (!buffer || !texture) {
      gl.deleteBuffer(buffer); gl.deleteTexture(texture);
      gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment); return;
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, "artwork"), 0);
    const uniforms = Object.fromEntries(["crop", "offset", "pointer", "time", "motion", "aspect", "trails[0]"].map(key => [key, gl.getUniformLocation(program, key)]));
    const particlesVertex = compile(gl.VERTEX_SHADER, particleVertexSource);
    const particlesFragment = compile(gl.FRAGMENT_SHADER, particleFragmentSource);
    const particlesProgram = gl.createProgram();
    const particlesBuffer = gl.createBuffer();
    let particlesAvailable = false;
    if (particlesVertex && particlesFragment && particlesProgram && particlesBuffer) {
      gl.attachShader(particlesProgram, particlesVertex); gl.attachShader(particlesProgram, particlesFragment); gl.linkProgram(particlesProgram);
      particlesAvailable = Boolean(gl.getProgramParameter(particlesProgram, gl.LINK_STATUS));
    }
    const particleAttributes = particlesAvailable ? [
      { location: gl.getAttribLocation(particlesProgram!, "position"), size: 2, offset: 0 },
      { location: gl.getAttribLocation(particlesProgram!, "size"), size: 1, offset: 8 },
      { location: gl.getAttribLocation(particlesProgram!, "alpha"), size: 1, offset: 12 },
      { location: gl.getAttribLocation(particlesProgram!, "color"), size: 3, offset: 16 },
    ] : [];
    const particleRatio = particlesAvailable ? gl.getUniformLocation(particlesProgram!, "pixelRatio") : null;
    const interaction = new WaveInteraction();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let frame = 0, elapsed = 0, previous = 0, visible = true, loaded = false, disposed = false, pixelRatio = 1;

    function draw(now: number) {
      frame = 0;
      if (!loaded || disposed || !visible || document.hidden || gl!.isContextLost()) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
      previous = now;
      const moving = !pausedRef.current && !reduced.matches;
      if (moving) {
        elapsed += dt;
        const ease = 1 - Math.exp(-dt * 3);
        pointer.x += (pointer.targetX - pointer.x) * ease;
        pointer.y += (pointer.targetY - pointer.y) * ease;
        interaction.step(dt);
      }
      if (reduced.matches) interaction.reset();
      gl!.useProgram(program);
      gl!.disable(gl!.BLEND);
      gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
      gl!.enableVertexAttribArray(position); gl!.vertexAttribPointer(position, 2, gl!.FLOAT, false, 0, 0);
      gl!.uniform1f(uniforms.time, elapsed);
      gl!.uniform1f(uniforms.motion, reduced.matches ? 0 : 1);
      gl!.uniform2f(uniforms.pointer, pointer.x, pointer.y);
      gl!.uniform4fv(uniforms["trails[0]"], interaction.trails);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      if (particlesAvailable && interaction.particleCount > 0) {
        gl!.useProgram(particlesProgram);
        gl!.bindBuffer(gl!.ARRAY_BUFFER, particlesBuffer);
        gl!.bufferData(gl!.ARRAY_BUFFER, interaction.particles, gl!.DYNAMIC_DRAW);
        for (const attribute of particleAttributes) {
          gl!.enableVertexAttribArray(attribute.location);
          gl!.vertexAttribPointer(attribute.location, attribute.size, gl!.FLOAT, false, 28, attribute.offset);
        }
        gl!.uniform1f(particleRatio, pixelRatio);
        gl!.enable(gl!.BLEND); gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE);
        gl!.drawArrays(gl!.POINTS, 0, interaction.particleCount);
        for (const attribute of particleAttributes) gl!.disableVertexAttribArray(attribute.location);
      }
      element!.dataset.ready = "true";
      if (moving) frame = requestAnimationFrame(draw);
    }
    function resume() {
      cancelAnimationFrame(frame); previous = 0;
      if (loaded && visible && !document.hidden && !disposed) draw(performance.now());
    }
    refresh.current = resume;
    function resize() {
      const bounds = element!.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, 1920 / bounds.width);
      pixelRatio = dpr;
      element!.width = Math.max(1, Math.round(bounds.width * dpr));
      element!.height = Math.max(1, Math.round(bounds.height * dpr));
      gl!.viewport(0, 0, element!.width, element!.height);
      const imageRatio = (original!.naturalWidth || 1672) / (original!.naturalHeight || 941);
      const ratio = bounds.width / bounds.height;
      const cropX = Math.min(1, ratio / imageRatio), cropY = Math.min(1, imageRatio / ratio);
      const alignment = window.innerWidth <= 700 ? 0.64 : 0.6;
      gl!.useProgram(program);
      gl!.uniform2f(uniforms.crop, cropX, cropY);
      gl!.uniform2f(uniforms.offset, (1 - cropX) * alignment, (1 - cropY) * 0.5);
      gl!.uniform1f(uniforms.aspect, bounds.width / bounds.height);
      interaction.resize(bounds.width, bounds.height);
      interaction.setSource(original!, cropX, cropY, (1 - cropX) * alignment, (1 - cropY) * 0.5);
      resume();
    }
    function upload() {
      if (disposed || !original!.naturalWidth || gl!.isContextLost()) return;
      try {
        gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, true);
        gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGB, gl!.RGB, gl!.UNSIGNED_BYTE, original!);
        loaded = true; resize();
      } catch { delete element!.dataset.ready; }
    }
    const scene = element.closest(".opening-scene");
    const move = (event: Event) => {
      const e = event as PointerEvent;
      if (!loaded || pausedRef.current || reduced.matches) return;
      if (e.target instanceof Element && e.target.closest("button, a, input, nav")) { interaction.leave(); return; }
      const bounds = element.getBoundingClientRect();
      pointer.targetX = (e.clientX - bounds.left) / bounds.width * 2 - 1;
      pointer.targetY = 1 - (e.clientY - bounds.top) / bounds.height * 2;
      interaction.move(e.clientX - bounds.left, e.clientY - bounds.top, performance.now());
    };
    const leave = () => { pointer.targetX = 0; pointer.targetY = 0; interaction.leave(); };
    const endTouch = (event: Event) => { if ((event as PointerEvent).pointerType !== "mouse") leave(); };
    const lost = (event: Event) => { event.preventDefault(); cancelAnimationFrame(frame); loaded = false; delete element.dataset.ready; };
    const restored = () => setGeneration(value => value + 1);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; resume(); });
    const resizer = new ResizeObserver(resize);
    observer.observe(element); resizer.observe(element);
    original.addEventListener("load", upload);
    scene?.addEventListener("pointermove", move, { passive: true }); scene?.addEventListener("pointerleave", leave);
    scene?.addEventListener("pointerdown", move, { passive: true }); scene?.addEventListener("pointerup", endTouch); scene?.addEventListener("pointercancel", leave);
    element.addEventListener("webglcontextlost", lost); element.addEventListener("webglcontextrestored", restored);
    document.addEventListener("visibilitychange", resume); reduced.addEventListener("change", resume);
    if (original.complete) upload();
    return () => {
      disposed = true; cancelAnimationFrame(frame); refresh.current = null; delete element.dataset.ready;
      observer.disconnect(); resizer.disconnect(); original.removeEventListener("load", upload);
      scene?.removeEventListener("pointermove", move); scene?.removeEventListener("pointerleave", leave);
      scene?.removeEventListener("pointerdown", move); scene?.removeEventListener("pointerup", endTouch); scene?.removeEventListener("pointercancel", leave);
      element.removeEventListener("webglcontextlost", lost); element.removeEventListener("webglcontextrestored", restored);
      document.removeEventListener("visibilitychange", resume); reduced.removeEventListener("change", resume);
      gl.deleteBuffer(buffer); gl.deleteTexture(texture); gl.deleteProgram(program); gl.deleteShader(vertex); gl.deleteShader(fragment);
      gl.deleteBuffer(particlesBuffer); gl.deleteProgram(particlesProgram);
      if (particlesVertex) gl.deleteShader(particlesVertex);
      if (particlesFragment) gl.deleteShader(particlesFragment);
    };
  }, [src, generation]);

  return <>
    <img ref={image} src={src} alt="" fetchPriority="high" />
    <canvas ref={canvas} className="animated-wave" aria-hidden="true" />
  </>;
}
