import { SCULPTURE_STRIDE, type SculptureModel } from "../utils/glb";
import { multiply, perspective, rotationX, rotationY, translation } from "../utils/mat4";
import { PARTICLE_STRIDE } from "../utils/surfaceSampling";
import type { SculptureFrame } from "./sculptureMotion";

export const FIELD_OF_VIEW = 0.49;

// The canvas is preserved so the passage can export the current frame as PNG.
export const SCULPTURE_CONTEXT_OPTIONS: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
};

export type SculptureView = {
  aspect: number;
  distance: number;
  shift: [number, number];
};

type Uniforms = Record<string, WebGLUniformLocation | null>;
type ProgramInfo = { program: WebGLProgram; uniforms: Uniforms };
type Target = { framebuffer: WebGLFramebuffer; texture: WebGLTexture; depth: WebGLRenderbuffer | null; width: number; height: number };

const quadVertex = `#version 300 es
in vec2 aQuad;
out vec2 vUv;
void main() {
  vUv = aQuad * 0.5 + 0.5;
  gl_Position = vec4(aQuad, 0.999, 1.0);
}`;

const backdropFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform float uAspect;
uniform float uTime;
uniform float uDissolve;
uniform float uEnergy;
uniform vec2 uWarm;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
  float haze = exp(-dot(p * vec2(0.8, 1.1), p * vec2(0.8, 1.1)) * 1.9);
  vec2 warm = p - uWarm;
  float glow = exp(-dot(warm, warm) * 2.6);
  vec3 color = vec3(0.010, 0.009, 0.008);
  color += haze * vec3(0.026, 0.020, 0.014);
  color += glow * vec3(0.085, 0.040, 0.013) * (0.55 + uDissolve * 0.9 + uEnergy * 0.7);
  vec2 grid = p * 150.0;
  vec2 cell = floor(grid);
  float star = step(0.9965, hash(cell)) * pow(max(0.0, 1.0 - length(fract(grid) - 0.5) * 2.0), 5.0);
  star *= 0.55 + 0.45 * sin(uTime * 1.6 + hash(cell + 7.0) * 40.0);
  color += star * vec3(0.9, 0.7, 0.45) * 0.16;
  color += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.008;
  outColor = vec4(color, 1.0);
}`;

const sharedDrift = `
vec3 drift(vec3 p, float t) {
  return vec3(
    sin(p.y * 3.1 + t * 0.85 + p.z * 1.3),
    sin(p.z * 2.6 - t * 0.70 + p.x * 1.9),
    sin(p.x * 2.9 + t * 0.75 + p.y * 2.2));
}`;

const meshVertex = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;
in vec3 aColor;
in vec2 aMaterial;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform float uTime;
uniform float uDissolve;
uniform float uBurst;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vColor;
out vec2 vMaterial;
out vec3 vLocal;
out float vDissolve;
${sharedDrift}
void main() {
  float d = clamp(uDissolve + uBurst * 0.35, 0.0, 1.0);
  vec3 p = aPosition + drift(aPosition, uTime) * d * 0.14 + aNormal * d * 0.04;
  vec4 world = uModel * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  vMaterial = aMaterial;
  vLocal = p;
  vDissolve = d;
  gl_Position = uViewProj * world;
}`;

const meshFragment = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vNormal;
in vec3 vColor;
in vec2 vMaterial;
in vec3 vLocal;
in float vDissolve;
uniform vec3 uCamera;
uniform float uTime;
uniform vec3 uWake;
uniform vec2 uResolution;
uniform float uAspect;
uniform float uEnergy;
out vec4 outColor;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise3(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
    f.z);
}
// A dark studio with an ivory overhead softbox, an amber strip and a silver edge.
vec3 environment(vec3 d, float rough) {
  float soft = 0.06 + rough * 0.45;
  vec3 c = vec3(0.010, 0.009, 0.008);
  c += vec3(1.0, 0.86, 0.66) * 1.0 * smoothstep(0.35 - soft, 0.92 + soft, d.y);
  c += vec3(1.0, 0.48, 0.16) * 0.85 * smoothstep(0.25 - soft, 0.85 + soft, d.x) * smoothstep(-0.7, 0.5, -d.z);
  c += vec3(0.62, 0.74, 0.92) * 0.7 * smoothstep(0.45 - soft, 0.95 + soft, -d.x);
  c += vec3(0.30, 0.11, 0.03) * smoothstep(-0.15, -0.9, d.y);
  return c;
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  // Noise decides which fragments survive the dissolve. The cursor's wake
  // lowers the threshold locally, so a gesture breaks the surface where it passes.
  vec2 ndc = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  vec2 offset = (ndc - uWake.xy) * vec2(uAspect, 1.0);
  float wake = exp(-dot(offset, offset) * 12.0) * uWake.z;
  float n = noise3(vLocal * 8.5 + vec3(0.0, uTime * 0.04, 0.0));
  // The curve keeps the form whole longer, so the final gathering is smooth rather than full of holes.
  float threshold = pow(vDissolve, 1.6) * 1.12 + wake * 0.7;
  if (n < threshold) discard;
  float ember = smoothstep(0.02, 0.2, threshold) * (1.0 - smoothstep(threshold, threshold + 0.1, n));

  vec3 N = normalize(vNormal);
  vec3 V = normalize(uCamera - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  float metal = vMaterial.x;
  float rough = clamp(vMaterial.y, 0.04, 1.0);
  vec3 F0 = mix(vec3(0.04), vColor, metal);
  vec3 keyDir = normalize(vec3(-0.55, 0.78, 0.42));
  vec3 rimDir = normalize(vec3(0.82, 0.18, -0.56));
  float ndl = max(dot(N, keyDir), 0.0);
  vec3 H = normalize(keyDir + V);
  float shine = mix(260.0, 22.0, rough);
  float spec = pow(max(dot(N, H), 0.0), shine) * (shine + 8.0) / 25.0;
  float facing = max(dot(N, V), 0.0);
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - facing, 5.0);
  vec3 reflection = environment(reflect(-V, N), rough);
  vec3 color = vColor * (1.0 - metal) * (0.09 + ndl * vec3(1.0, 0.84, 0.63) * 1.15);
  color += reflection * F * (1.0 - rough * 0.4);
  color += vec3(1.0, 0.9, 0.74) * spec * 0.55 * (1.0 - rough * 0.5);
  color += vec3(0.5, 0.66, 0.95) * pow(1.0 - facing, 3.0) * max(dot(N, rimDir), 0.0) * 0.35;
  color += vec3(1.0, 0.42, 0.12) * ember * 1.6 * (1.0 + uEnergy * 2.0);
  color = aces(color * 0.95);
  outColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}`;

const pointVertex = `#version 300 es
precision highp float;
in vec3 aPosition;
in vec3 aNormal;
in vec3 aColor;
in vec4 aSeed;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform float uTime;
uniform float uDissolve;
uniform float uBurst;
uniform vec3 uWake;
uniform float uAspect;
uniform float uEnergy;
uniform float uPixelsPerUnit;
out vec3 vColor;
out float vAlpha;
${sharedDrift}
void main() {
  float d = clamp(uDissolve + uBurst * 0.35, 0.0, 1.0);
  vec3 n = normalize(aNormal);
  vec3 radial = normalize(aPosition + vec3(1e-4));
  // Particles lift off the surface, then travel with the same current as the mesh.
  vec3 p = aPosition + n * (0.006 + aSeed.y * 0.02) * (0.4 + d);
  p += drift(aPosition, uTime) * d * (0.10 + aSeed.z * 0.42);
  p += radial * (uBurst * (0.10 + aSeed.z * 0.45));
  vec4 clip = uViewProj * uModel * vec4(p, 1.0);
  vec2 ndc = clip.xy / clip.w;
  vec2 offset = (ndc - uWake.xy) * vec2(uAspect, 1.0);
  float wake = exp(-dot(offset, offset) * 12.0) * uWake.z;
  vec2 push = normalize(offset + vec2(1e-5)) * vec2(1.0 / uAspect, 1.0) * wake * 0.12;
  clip.xy += push * clip.w * (0.5 + aSeed.x);
  gl_Position = clip;
  float size = 0.0026 + aSeed.w * 0.0040 + d * 0.007;
  gl_PointSize = clamp(uPixelsPerUnit * size / clip.w, 1.0, 48.0);
  vec3 light = normalize(vec3(-0.55, 0.78, 0.42));
  float lit = 0.5 + 0.5 * max(dot(mat3(uModel) * n, light), 0.0);
  float sparkle = 0.55 + 0.45 * sin(uTime * 2.2 + aSeed.x * 52.0);
  vColor = mix(aColor * 2.1, vec3(1.0, 0.45, 0.14), d * 0.5) * lit * (1.0 + uEnergy * 0.9);
  vAlpha = (0.16 + 0.62 * d) * sparkle * (0.6 + 0.4 * aSeed.y);
}`;

const pointFragment = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main() {
  vec2 c = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(c, c);
  if (r2 > 1.0) discard;
  outColor = vec4(vColor * 1.35, exp(-r2 * 3.2) * vAlpha);
}`;

const brightFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
out vec4 outColor;
void main() {
  vec3 c = texture(uSource, vUv).rgb;
  float lum = max(c.r, max(c.g, c.b));
  outColor = vec4(c * smoothstep(0.62, 1.0, lum), 1.0);
}`;

const blurFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSource;
uniform vec2 uDirection;
out vec4 outColor;
void main() {
  vec3 sum = texture(uSource, vUv).rgb * 0.2270270270;
  sum += texture(uSource, vUv + uDirection * 1.3846153846).rgb * 0.3162162162;
  sum += texture(uSource, vUv - uDirection * 1.3846153846).rgb * 0.3162162162;
  sum += texture(uSource, vUv + uDirection * 3.2307692308).rgb * 0.0702702703;
  sum += texture(uSource, vUv - uDirection * 3.2307692308).rgb * 0.0702702703;
  outColor = vec4(sum, 1.0);
}`;

const compositeFragment = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
out vec4 outColor;
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
void main() {
  vec3 color = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * 0.7;
  vec2 q = vUv - 0.5;
  color *= 1.0 - dot(q, q) * 0.8;
  color += (hash(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);
  outColor = vec4(color, 1.0);
}`;

export class SculptureRenderer {
  private readonly gl: WebGL2RenderingContext;
  private width = 0;
  private height = 0;
  private scene: Target | null = null;
  private bright: Target | null = null;
  private ping: Target | null = null;
  private pong: Target | null = null;
  private readonly quadVao: WebGLVertexArrayObject;
  private readonly quadBuffer: WebGLBuffer;
  private readonly meshVao: WebGLVertexArrayObject;
  private readonly meshBuffer: WebGLBuffer;
  private readonly meshIndexBuffer: WebGLBuffer;
  private readonly meshIndexCount: number;
  private readonly pointVao: WebGLVertexArrayObject;
  private readonly pointBuffer: WebGLBuffer;
  private readonly pointCount: number;
  private readonly backdrop: ProgramInfo;
  private readonly mesh: ProgramInfo;
  private readonly points: ProgramInfo;
  private readonly brightPass: ProgramInfo;
  private readonly blur: ProgramInfo;
  private readonly composite: ProgramInfo;

  private constructor(gl: WebGL2RenderingContext, model: SculptureModel, particles: Float32Array) {
    this.gl = gl;
    this.quadVao = gl.createVertexArray()!;
    this.quadBuffer = gl.createBuffer()!;
    this.meshVao = gl.createVertexArray()!;
    this.meshBuffer = gl.createBuffer()!;
    this.meshIndexBuffer = gl.createBuffer()!;
    this.pointVao = gl.createVertexArray()!;
    this.pointBuffer = gl.createBuffer()!;
    this.meshIndexCount = model.indices.length;
    this.pointCount = particles.length / PARTICLE_STRIDE;

    this.backdrop = link(gl, quadVertex, backdropFragment, ["aQuad"]);
    this.mesh = link(gl, meshVertex, meshFragment, ["aPosition", "aNormal", "aColor", "aMaterial"]);
    this.points = link(gl, pointVertex, pointFragment, ["aPosition", "aNormal", "aColor", "aSeed"]);
    this.brightPass = link(gl, quadVertex, brightFragment, ["aQuad"]);
    this.blur = link(gl, quadVertex, blurFragment, ["aQuad"]);
    this.composite = link(gl, quadVertex, compositeFragment, ["aQuad"]);

    gl.bindVertexArray(this.quadVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    bindAttribute(gl, 0, 2, 8, 0);

    const meshStride = SCULPTURE_STRIDE * 4;
    gl.bindVertexArray(this.meshVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.meshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
    bindAttribute(gl, 0, 3, meshStride, 0);
    bindAttribute(gl, 1, 3, meshStride, 12);
    bindAttribute(gl, 2, 3, meshStride, 24);
    bindAttribute(gl, 3, 2, meshStride, 36);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.indices, gl.STATIC_DRAW);

    const pointStride = PARTICLE_STRIDE * 4;
    gl.bindVertexArray(this.pointVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);
    bindAttribute(gl, 0, 3, pointStride, 0);
    bindAttribute(gl, 1, 3, pointStride, 12);
    bindAttribute(gl, 2, 3, pointStride, 24);
    bindAttribute(gl, 3, 4, pointStride, 36);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  // Returns null when the shaders cannot be built, so the caller can keep
  // showing the Blender still.
  static create(gl: WebGL2RenderingContext, model: SculptureModel, particles: Float32Array): SculptureRenderer | null {
    try {
      return new SculptureRenderer(gl, model, particles);
    } catch (error) {
      console.warn("The sculpture renderer could not start.", error);
      return null;
    }
  }

  resize(width: number, height: number) {
    if (width === this.width && height === this.height) return;
    this.width = width;
    this.height = height;
    this.releaseTargets();
    const gl = this.gl;
    const halfWidth = Math.max(1, width >> 1), halfHeight = Math.max(1, height >> 1);
    this.scene = createTarget(gl, width, height, true);
    this.bright = createTarget(gl, halfWidth, halfHeight, false);
    this.ping = createTarget(gl, halfWidth, halfHeight, false);
    this.pong = createTarget(gl, halfWidth, halfHeight, false);
  }

  draw(frame: SculptureFrame, view: SculptureView) {
    const { gl, scene, bright, ping, pong } = this;
    if (!scene || !bright || !ping || !pong || gl.isContextLost()) return;

    const projection = perspective(FIELD_OF_VIEW, view.aspect, 0.1, 40);
    const viewProjection = multiply(translation(view.shift[0], view.shift[1], 0), multiply(projection, translation(0, 0, -view.distance)));
    const model = multiply(rotationX(frame.pitch), rotationY(frame.yaw));
    const pixelsPerUnit = this.height * 0.5 * projection[5];
    const wake: [number, number, number] = [frame.pointer.x, frame.pointer.y, frame.wake];

    gl.bindFramebuffer(gl.FRAMEBUFFER, scene.framebuffer);
    gl.viewport(0, 0, scene.width, scene.height);
    gl.clearColor(0.01, 0.009, 0.008, 1);
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.backdrop.program);
    this.set(this.backdrop, "uAspect", (u) => gl.uniform1f(u, view.aspect));
    this.set(this.backdrop, "uTime", (u) => gl.uniform1f(u, frame.time));
    this.set(this.backdrop, "uDissolve", (u) => gl.uniform1f(u, frame.dissolve));
    this.set(this.backdrop, "uEnergy", (u) => gl.uniform1f(u, frame.energy));
    this.set(this.backdrop, "uWarm", (u) => gl.uniform2f(u, view.shift[0] * view.aspect * 0.5, view.shift[1] * 0.5));
    this.drawQuad();

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    const dissolve = frame.dissolve, burst = frame.burst;
    gl.useProgram(this.mesh.program);
    this.set(this.mesh, "uModel", (u) => gl.uniformMatrix4fv(u, false, model));
    this.set(this.mesh, "uViewProj", (u) => gl.uniformMatrix4fv(u, false, viewProjection));
    this.set(this.mesh, "uCamera", (u) => gl.uniform3f(u, 0, 0, view.distance));
    this.set(this.mesh, "uTime", (u) => gl.uniform1f(u, frame.time));
    this.set(this.mesh, "uDissolve", (u) => gl.uniform1f(u, dissolve));
    this.set(this.mesh, "uBurst", (u) => gl.uniform1f(u, burst));
    this.set(this.mesh, "uWake", (u) => gl.uniform3f(u, wake[0], wake[1], wake[2]));
    this.set(this.mesh, "uResolution", (u) => gl.uniform2f(u, scene.width, scene.height));
    this.set(this.mesh, "uAspect", (u) => gl.uniform1f(u, view.aspect));
    this.set(this.mesh, "uEnergy", (u) => gl.uniform1f(u, frame.energy));
    gl.bindVertexArray(this.meshVao);
    gl.drawElements(gl.TRIANGLES, this.meshIndexCount, gl.UNSIGNED_INT, 0);

    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(this.points.program);
    this.set(this.points, "uModel", (u) => gl.uniformMatrix4fv(u, false, model));
    this.set(this.points, "uViewProj", (u) => gl.uniformMatrix4fv(u, false, viewProjection));
    this.set(this.points, "uTime", (u) => gl.uniform1f(u, frame.time));
    this.set(this.points, "uDissolve", (u) => gl.uniform1f(u, dissolve));
    this.set(this.points, "uBurst", (u) => gl.uniform1f(u, burst));
    this.set(this.points, "uWake", (u) => gl.uniform3f(u, wake[0], wake[1], wake[2]));
    this.set(this.points, "uAspect", (u) => gl.uniform1f(u, view.aspect));
    this.set(this.points, "uPixelsPerUnit", (u) => gl.uniform1f(u, pixelsPerUnit));
    this.set(this.points, "uEnergy", (u) => gl.uniform1f(u, frame.energy));
    gl.bindVertexArray(this.pointVao);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);

    // Bloom: isolate the hot highlights at half resolution, then blur them twice.
    this.pass(bright, this.brightPass, scene.texture, () => {});
    this.pass(ping, this.blur, bright.texture, (u) => gl.uniform2f(u, 1 / bright.width, 0));
    this.pass(pong, this.blur, ping.texture, (u) => gl.uniform2f(u, 0, 1 / bright.height));
    this.pass(ping, this.blur, pong.texture, (u) => gl.uniform2f(u, 2.2 / bright.width, 0));
    this.pass(pong, this.blur, ping.texture, (u) => gl.uniform2f(u, 0, 2.2 / bright.height));

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.composite.program);
    this.bindTexture(0, scene.texture, this.composite, "uScene");
    this.bindTexture(1, pong.texture, this.composite, "uBloom");
    this.drawQuad();
    gl.bindVertexArray(null);
  }

  dispose() {
    const gl = this.gl;
    this.releaseTargets();
    gl.deleteVertexArray(this.quadVao); gl.deleteBuffer(this.quadBuffer);
    gl.deleteVertexArray(this.meshVao); gl.deleteBuffer(this.meshBuffer); gl.deleteBuffer(this.meshIndexBuffer);
    gl.deleteVertexArray(this.pointVao); gl.deleteBuffer(this.pointBuffer);
    for (const info of [this.backdrop, this.mesh, this.points, this.brightPass, this.blur, this.composite]) gl.deleteProgram(info.program);
  }

  private pass(target: Target, info: ProgramInfo, source: WebGLTexture, configure: (u: WebGLUniformLocation | null) => void) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.useProgram(info.program);
    this.bindTexture(0, source, info, "uSource");
    if (info === this.blur) configure(info.uniforms.uDirection ?? null);
    this.drawQuad();
  }

  private bindTexture(unit: number, texture: WebGLTexture, info: ProgramInfo, name: string) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(info.uniforms[name] ?? null, unit);
  }

  private drawQuad() {
    const gl = this.gl;
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private set(info: ProgramInfo, name: string, write: (location: WebGLUniformLocation | null) => void) {
    write(info.uniforms[name] ?? null);
  }

  private releaseTargets() {
    for (const target of [this.scene, this.bright, this.ping, this.pong]) {
      if (!target) continue;
      this.gl.deleteFramebuffer(target.framebuffer);
      this.gl.deleteTexture(target.texture);
      if (target.depth) this.gl.deleteRenderbuffer(target.depth);
    }
    this.scene = this.bright = this.ping = this.pong = null;
  }
}

function bindAttribute(gl: WebGL2RenderingContext, index: number, size: number, stride: number, offset: number) {
  gl.enableVertexAttribArray(index);
  gl.vertexAttribPointer(index, size, gl.FLOAT, false, stride, offset);
}

function createTarget(gl: WebGL2RenderingContext, width: number, height: number, withDepth: boolean): Target {
  const framebuffer = gl.createFramebuffer()!;
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  let depth: WebGLRenderbuffer | null = null;
  if (withDepth) {
    depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  }
  const complete = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (!complete) throw new Error("A sculpture render target is incomplete.");
  return { framebuffer, texture, depth, width, height };
}

function link(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string, attributes: string[]): ProgramInfo {
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) throw new Error("The sculpture program could not be created.");
  attributes.forEach((name, index) => gl.bindAttribLocation(program, index, name));
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log ?? "The sculpture program failed to link.");
  }
  const uniforms: Uniforms = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i);
    if (info) uniforms[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(program, info.name);
  }
  return { program, uniforms };
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("A sculpture shader could not be created.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log ?? "A sculpture shader failed to compile.");
  }
  return shader;
}

