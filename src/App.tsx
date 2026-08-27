import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

import "./styles/solaris.css";

type Mode = {
  name: string;
  accent: string;
  rgb: string;
  descriptor: string;
  frequency: number;
};

type AudioRig = {
  context: AudioContext;
  oscillator: OscillatorNode;
  gain: GainNode;
  analyser: AnalyserNode;
};

const modes: Mode[] = [
  { name: "PRISM", accent: "#3656ff", rgb: "54, 86, 255", descriptor: "clear / electric", frequency: 196 },
  { name: "SOL", accent: "#ff725c", rgb: "255, 114, 92", descriptor: "warm / kinetic", frequency: 164 },
  { name: "VIOLET", accent: "#a67cff", rgb: "166, 124, 255", descriptor: "deep / lucid", frequency: 220 },
  { name: "MOSS", accent: "#76bb38", rgb: "118, 187, 56", descriptor: "quiet / alive", frequency: 146 },
];

type Particle = {
  angle: number;
  distance: number;
  speed: number;
  size: number;
  phase: number;
  orbit: number;
};

function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  const number = Number.parseInt(value, 16);

  return {
    red: (number >> 16) & 255,
    green: (number >> 8) & 255,
    blue: number & 255,
  };
}

function SolarisFallbackCanvas({ mode, intensity }: { mode: Mode; intensity: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5, energy: 0.32 });
  const modeRef = useRef(mode);
  const intensityRef = useRef(intensity);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvas = canvasElement;

    let context: CanvasRenderingContext2D;
    try {
      const resolvedContext = canvas.getContext("2d");
      if (!resolvedContext) return;
      context = resolvedContext;
    } catch {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles: Particle[] = Array.from({ length: 64 }, (_, index) => ({
      angle: (index / 64) * Math.PI * 2 + Math.random() * 0.4,
      distance: 0.11 + Math.random() * 0.52,
      speed: (Math.random() * 0.22 + 0.04) * (index % 3 === 0 ? -1 : 1),
      size: Math.random() * 2.8 + 0.7,
      phase: Math.random() * Math.PI * 2,
      orbit: 0.68 + Math.random() * 0.56,
    }));
    let frameId = 0;
    let lastTime = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(time: number) {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;

      const delta = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
      lastTime = time;
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * Math.min(1, delta * 4.5);
      pointer.y += (pointer.targetY - pointer.y) * Math.min(1, delta * 4.5);
      pointer.energy += (0.28 - pointer.energy) * Math.min(1, delta * 1.5);

      const currentMode = modeRef.current;
      const color = hexToRgb(currentMode.accent);
      const centerX = width * (0.5 + (pointer.x - 0.5) * 0.16);
      const centerY = height * (0.5 + (pointer.y - 0.5) * 0.16);
      const radius = Math.min(width, height) * 0.17;
      const motionTime = reducedMotion ? 0 : time / 1000;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#10131e";
      context.fillRect(0, 0, width, height);

      const atmosphere = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.72);
      atmosphere.addColorStop(0, `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.16 + intensityRef.current * 0.2})`);
      atmosphere.addColorStop(0.35, `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.04 + intensityRef.current * 0.05})`);
      atmosphere.addColorStop(1, "rgba(16, 19, 30, 0)");
      context.fillStyle = atmosphere;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(centerX, centerY);
      context.rotate(motionTime * 0.045);
      [1, 1.34, 1.78].forEach((scale, index) => {
        context.beginPath();
        context.ellipse(0, 0, radius * scale, radius * (0.38 + index * 0.08), index === 1 ? -0.62 : index === 2 ? 0.35 : 0.1, 0, Math.PI * 2);
        context.strokeStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.27 - index * 0.055})`;
        context.lineWidth = index === 0 ? 1.4 : 0.8;
        context.stroke();
      });
      context.restore();

      context.globalCompositeOperation = "lighter";
      particles.forEach((particle) => {
        const angle = particle.angle + motionTime * particle.speed * intensityRef.current;
        const wave = Math.sin(motionTime * 0.7 + particle.phase) * 0.035 * intensityRef.current;
        const orbitDistance = Math.min(width, height) * (particle.distance + wave);
        const x = centerX + Math.cos(angle) * orbitDistance * particle.orbit;
        const y = centerY + Math.sin(angle) * orbitDistance;
        const alpha = 0.22 + Math.sin(motionTime * 1.8 + particle.phase) * 0.12;
        context.beginPath();
        context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, ${Math.max(0.05, alpha)})`;
        context.arc(x, y, particle.size * (0.75 + intensityRef.current * 0.45), 0, Math.PI * 2);
        context.fill();
      });

      const coreGlow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2.2);
      coreGlow.addColorStop(0, `rgba(255, 255, 255, ${0.62 + intensityRef.current * 0.2})`);
      coreGlow.addColorStop(0.08, `rgba(${color.red}, ${color.green}, ${color.blue}, 0.9)`);
      coreGlow.addColorStop(0.3, `rgba(${color.red}, ${color.green}, ${color.blue}, 0.25)`);
      coreGlow.addColorStop(1, `rgba(${color.red}, ${color.green}, ${color.blue}, 0)`);
      context.fillStyle = coreGlow;
      context.beginPath();
      context.arc(centerX, centerY, radius * 2.2, 0, Math.PI * 2);
      context.fill();

      context.globalCompositeOperation = "source-over";
      context.beginPath();
      context.arc(centerX, centerY, radius * (0.34 + intensityRef.current * 0.12), 0, Math.PI * 2);
      context.fillStyle = `rgba(${color.red}, ${color.green}, ${color.blue}, 0.92)`;
      context.fill();
      context.beginPath();
      context.arc(centerX - radius * 0.11, centerY - radius * 0.13, radius * 0.1, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 255, 255, 0.82)";
      context.fill();

      if (!reducedMotion) frameId = window.requestAnimationFrame(draw);
    }

    resize();
    draw(0);
    window.addEventListener("resize", resize);
    if (!reducedMotion) frameId = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  function updatePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    pointerRef.current.targetX = x;
    pointerRef.current.targetY = y;
    pointerRef.current.energy = Math.min(1, pointerRef.current.energy + 0.18);
  }

  return (
    <canvas
      ref={canvasRef}
      className="solaris-canvas"
      data-renderer="2d-fallback"
      aria-label="Instrumento visual interativo"
      onPointerMove={updatePointer}
      onPointerDown={updatePointer}
      onPointerLeave={() => {
        pointerRef.current.targetX = 0.5;
        pointerRef.current.targetY = 0.5;
      }}
    />
  );
}

const orbVertexShader = `#version 300 es
in vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const orbFragmentShader = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 u_resolution;
uniform float u_time;
uniform float u_intensity;
uniform float u_pulse;
uniform float u_audio;
uniform vec2 u_pointer;
uniform vec3 u_color;

#define TAU 6.28318530718

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float hash(float value) {
  return fract(sin(value * 127.1) * 43758.5453);
}

float intersectSphere(vec3 origin, vec3 direction, float radius, out vec3 hitPoint) {
  float projection = dot(origin, direction);
  float discriminant = projection * projection - (dot(origin, origin) - radius * radius);
  if (discriminant < 0.0) return -1.0;
  float root = sqrt(discriminant);
  float nearDistance = -projection - root;
  float farDistance = -projection + root;
  float hitDistance = nearDistance > 0.0 ? nearDistance : farDistance;
  if (hitDistance < 0.0) return -1.0;
  hitPoint = origin + direction * hitDistance;
  return hitDistance;
}

void main() {
  vec2 centered = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  vec2 pointer = u_pointer - 0.5;
  vec3 background = vec3(0.025, 0.035, 0.062);
  float vignette = 1.0 - smoothstep(0.2, 1.55, length(centered));
  float heartbeat = 0.5 + 0.5 * sin(u_time * 1.25 + sin(u_time * 0.31) * 0.7);
  float atmosphere = exp(-length(centered) * 1.7) * (0.12 + u_intensity * 0.12 + heartbeat * 0.035 + u_audio * 0.08);
  vec3 color = background * (0.7 + vignette * 0.3) + u_color * atmosphere;
  float radialDistance = length(centered);
  float polarAngle = atan(centered.y, centered.x);
  float edgeWave = sin(polarAngle * 5.0 - u_time * 1.35 + sin(polarAngle * 2.0 + u_time * 0.4)) * 0.012;
  edgeWave += sin(polarAngle * 9.0 + u_time * 0.82) * 0.006;
  float silhouetteRadius = 0.786 + edgeWave + u_pulse * 0.018 + u_audio * 0.008;
  float edgeHalo = exp(-abs(radialDistance - silhouetteRadius) * 175.0) * (0.14 + heartbeat * 0.12 + u_audio * 0.6);
  color += u_color * edgeHalo;
  color += u_color * exp(-abs(length(centered) - 0.82) * 20.0) * u_pulse * 0.26;
  float veilOne = exp(-abs(centered.y - sin(centered.x * 2.2 + u_time * 0.3) * (0.18 + u_audio * 0.035)) * 18.0);
  float veilTwo = exp(-abs(centered.y + 0.46 - sin(centered.x * 3.5 - u_time * 0.22) * 0.12) * 24.0);
  color += u_color * (veilOne * 0.026 + veilTwo * 0.018) * (0.4 + vignette + u_audio * 0.8);

  vec3 origin = vec3(pointer.x * 0.18, -pointer.y * 0.18, 3.18);
  vec3 direction = normalize(vec3(centered * 0.88, -2.0));
  vec3 hitPoint;
  float breathingRadius = 1.04 + heartbeat * 0.028 + u_audio * 0.018 + u_pulse * 0.035;
  float hitDistance = intersectSphere(origin, direction, breathingRadius, hitPoint);

  if (hitDistance > 0.0) {
    float surfaceMask = 1.0 - smoothstep(silhouetteRadius - 0.018, silhouetteRadius + 0.003, radialDistance);
    vec3 localPoint = hitPoint;
    localPoint.yz = rotate2d(u_pointer.y * 0.34 + u_time * 0.16) * localPoint.yz;
    localPoint.xz = rotate2d(-u_pointer.x * 0.34 - u_time * 0.2) * localPoint.xz;
    float ripple = sin(localPoint.x * 7.0 + u_time * 1.3) * sin(localPoint.z * 8.0 - u_time * 0.95);
    float detail = sin(localPoint.y * 14.0 + localPoint.x * 4.0 + u_time * 0.8);
    float pulseWave = sin(length(localPoint) * 24.0 - u_pulse * 16.0 - u_time * 1.1) * (u_pulse + u_audio * 0.3);
    float current = sin(localPoint.y * 20.0 - localPoint.x * 6.0 - u_time * 2.4 + localPoint.z * 5.0);
    vec3 normal = normalize(hitPoint + vec3(ripple + current * 0.5, detail, pulseWave + current * 0.45) * (0.024 + u_intensity * 0.034 + u_audio * 0.02));
    vec3 lightDirection = normalize(vec3(-0.55, 0.85, 1.25));
    vec3 viewDirection = normalize(origin - hitPoint);
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float specular = pow(max(dot(normal, halfDirection), 0.0), 44.0);
    float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.6);
    float contour = 0.5 + 0.5 * sin(localPoint.y * 11.0 + localPoint.x * 5.0 + u_time * 1.25);
    float energyBand = pow(0.5 + 0.5 * sin(localPoint.y * 12.0 - u_time * 1.8 + localPoint.z * 4.0), 8.0);
    vec3 surface = u_color * (0.18 + diffuse * 0.55 + contour * 0.13 * u_intensity + energyBand * (0.18 + u_audio * 0.52));
    surface += vec3(0.85, 0.91, 1.0) * (specular * 0.9 + fresnel * 0.28);
    color += surface * (1.0 - smoothstep(2.4, 3.7, hitDistance)) * surfaceMask;
    color += u_color * fresnel * (0.42 + u_pulse * 0.95 + u_audio * 0.35) * surfaceMask;
    color += vec3(1.0, 0.97, 0.92) * specular * (0.45 + u_pulse * 0.65) * surfaceMask;
  }

  vec2 ringPoint = centered * rotate2d(0.18 + pointer.x * 0.3 + u_time * 0.07);
  float ringOne = abs(length(vec2(ringPoint.x, ringPoint.y * 2.9)) - 1.04);
  float ringTwo = abs(length(vec2(ringPoint.x, ringPoint.y * 2.35)) - 1.32);
  float ringThree = abs(length(vec2(ringPoint.x, ringPoint.y * 3.6)) - 0.88);
  float ringMotion = 0.68 + 0.32 * sin(u_time * 1.7 + length(centered) * 16.0);
  float rings = exp(-ringOne * 82.0) * 0.19 + exp(-ringTwo * 92.0) * 0.13 + exp(-ringThree * 100.0) * 0.1;
  color += u_color * rings * (0.65 + u_intensity * 0.55 + u_audio * 0.7) * ringMotion;
  float ringDash = pow(0.5 + 0.5 * sin(atan(ringPoint.y * 2.9, ringPoint.x) * 10.0 - u_time * 1.65), 14.0);
  color += u_color * exp(-ringOne * 112.0) * ringDash * (0.16 + u_audio * 0.52);
  color += u_color * exp(-abs(length(centered) - (1.02 + heartbeat * 0.04)) * 30.0) * (u_pulse * 0.18 + u_audio * 0.08);

  for (int index = 0; index < 46; index += 1) {
    float particleIndex = float(index);
    float depth = hash(particleIndex + 43.0);
    vec2 starPosition = vec2(
      hash(particleIndex * 1.73 + 4.0) * 3.25 - 1.62,
      hash(particleIndex * 2.41 + 8.0) * 1.92 - 0.96
    );
    starPosition += pointer * (0.012 + depth * 0.065);
    float starSize = 0.002 + depth * 0.008;
    float starDistance = length(centered - starPosition);
    float starGlow = exp(-starDistance * starDistance / (starSize * starSize));
    float starTwinkle = 0.35 + 0.65 * (0.5 + 0.5 * sin(u_time * (0.45 + depth * 1.6) + particleIndex * 2.7));
    color += u_color * starGlow * starTwinkle * (0.08 + depth * 0.48);
  }

  for (int index = 0; index < 38; index += 1) {
    float particleIndex = float(index);
    float angle = particleIndex / 38.0 * TAU + u_time * (0.08 + mod(particleIndex, 3.0) * 0.025);
    float radius = 1.2 + hash(particleIndex + 3.0) * 0.76;
    vec3 particle = vec3(
      cos(angle) * radius,
      (hash(particleIndex + 11.0) - 0.5) * 0.9,
      sin(angle) * radius
    );
    particle.yz = rotate2d(0.18 + u_pointer.y * 0.28) * particle.yz;
    particle.xz = rotate2d(u_time * 0.1 + u_pointer.x * 0.2) * particle.xz;
    vec3 relative = particle - origin;
    vec2 projected = relative.xy / max(0.3, -relative.z) * 1.62;
    float size = 0.004 + hash(particleIndex + 21.0) * 0.008;
    float distanceToParticle = length(centered - projected);
    float twinkle = 0.5 + 0.5 * sin(u_time * (1.4 + hash(particleIndex) * 2.0) + particleIndex);
    float glow = exp(-distanceToParticle * distanceToParticle / (size * size)) * (0.25 + twinkle * 0.7);
    color += u_color * glow * (0.4 + u_intensity * 0.8 + u_audio * 0.9);
  }

  for (int index = 0; index < 5; index += 1) {
    float satelliteIndex = float(index);
    float satelliteAngle = satelliteIndex / 5.0 * TAU + u_time * (0.18 + satelliteIndex * 0.018);
    float satelliteRadius = 1.32 + hash(satelliteIndex + 71.0) * 0.64;
    vec3 satellite = vec3(
      cos(satelliteAngle) * satelliteRadius,
      sin(satelliteAngle * 1.7 + satelliteIndex) * 0.32,
      sin(satelliteAngle) * satelliteRadius
    );
    satellite.yz = rotate2d(0.18 + u_pointer.y * 0.28) * satellite.yz;
    satellite.xz = rotate2d(u_time * 0.12 + u_pointer.x * 0.2) * satellite.xz;
    vec3 satelliteRelative = satellite - origin;
    vec2 satelliteProjected = satelliteRelative.xy / max(0.3, -satelliteRelative.z) * 1.62;
    float satelliteSize = 0.009 + hash(satelliteIndex + 93.0) * 0.009;
    float satelliteDistance = length(centered - satelliteProjected);
    float satellitePulse = 0.35 + 0.65 * (0.5 + 0.5 * sin(u_time * 2.0 + satelliteIndex * 2.4));
    float satelliteGlow = exp(-satelliteDistance * satelliteDistance / (satelliteSize * satelliteSize));
    color += (u_color + vec3(0.28, 0.36, 0.5)) * satelliteGlow * (0.45 + satellitePulse * 0.9 + u_audio * 0.9);

    vec3 trail = satellite - normalize(vec3(-sin(satelliteAngle), 0.0, cos(satelliteAngle))) * 0.16;
    vec3 trailRelative = trail - origin;
    vec2 trailProjected = trailRelative.xy / max(0.3, -trailRelative.z) * 1.62;
    float trailDistance = length(centered - trailProjected);
    float trailGlow = exp(-trailDistance * trailDistance / (satelliteSize * satelliteSize * 4.8));
    color += u_color * trailGlow * (0.05 + satellitePulse * 0.16 + u_audio * 0.18);
  }

  float coreGlow = exp(-length(centered) * 3.5) * (0.025 + u_intensity * 0.025 + heartbeat * 0.012 + u_audio * 0.035);
  color += vec3(1.0) * coreGlow;
  color = pow(max(color, 0.0), vec3(0.88));
  outColor = vec4(color, 1.0);
}
`;

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function SolarisWebGLCanvas({ mode, intensity, audioLevel, onUnavailable }: { mode: Mode; intensity: number; audioLevel: number; onUnavailable: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const pulseRef = useRef(0);
  const modeRef = useRef(mode);
  const intensityRef = useRef(intensity);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;
    const canvas = canvasElement;

    let gl: WebGL2RenderingContext;
    try {
      const resolvedContext = canvas.getContext("webgl2", { alpha: false, antialias: true, powerPreference: "high-performance" });
      if (!resolvedContext) {
        onUnavailable();
        return;
      }
      gl = resolvedContext;
    } catch {
      onUnavailable();
      return;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, orbVertexShader);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, orbFragmentShader);
    if (!vertexShader || !fragmentShader) {
      onUnavailable();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      onUnavailable();
      return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      onUnavailable();
      return;
    }

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      onUnavailable();
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, "a_position");
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    const intensityLocation = gl.getUniformLocation(program, "u_intensity");
    const pointerLocation = gl.getUniformLocation(program, "u_pointer");
    const colorLocation = gl.getUniformLocation(program, "u_color");
    const pulseLocation = gl.getUniformLocation(program, "u_pulse");
    const audioLocation = gl.getUniformLocation(program, "u_audio");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frameId = 0;
    let lastTime = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render(time: number) {
      const delta = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
      lastTime = time;
      const pointer = pointerRef.current;
      pointer.x += (pointer.targetX - pointer.x) * Math.min(1, delta * 4.2);
      pointer.y += (pointer.targetY - pointer.y) * Math.min(1, delta * 4.2);
      pulseRef.current = Math.max(0, pulseRef.current - delta * 1.8);
      const color = hexToRgb(modeRef.current.accent);
      const seconds = reducedMotion ? 0 : time / 1000;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, seconds);
      gl.uniform1f(intensityLocation, intensityRef.current);
      gl.uniform1f(pulseLocation, pulseRef.current);
      gl.uniform1f(audioLocation, reducedMotion ? 0 : audioLevelRef.current);
      gl.uniform2f(pointerLocation, pointer.x, pointer.y);
      gl.uniform3f(colorLocation, color.red / 255, color.green / 255, color.blue / 255);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!reducedMotion) frameId = window.requestAnimationFrame(render);
    }

    function handleContextLost(event: Event) {
      event.preventDefault();
      onUnavailable();
    }

    resize();
    render(0);
    window.addEventListener("resize", resize);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    if (!reducedMotion) frameId = window.requestAnimationFrame(render);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      window.cancelAnimationFrame(frameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [onUnavailable]);

  function updatePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
    pointerRef.current.targetX = x;
    pointerRef.current.targetY = y;
  }

  function pulsePointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    updatePointer(event);
    pulseRef.current = 1;
  }

  return (
    <canvas
      ref={canvasRef}
      className="solaris-canvas"
      data-renderer="webgl2"
      aria-label="Instrumento visual interativo em WebGL 3D"
      onPointerMove={updatePointer}
      onPointerDown={pulsePointer}
      onPointerLeave={() => {
        pointerRef.current.targetX = 0.5;
        pointerRef.current.targetY = 0.5;
      }}
    />
  );
}

function SolarisCanvas({ mode, intensity, audioLevel }: { mode: Mode; intensity: number; audioLevel: number }) {
  const [renderer, setRenderer] = useState<"webgl" | "fallback">("webgl");
  const handleUnavailable = useCallback(() => setRenderer("fallback"), []);

  if (renderer === "fallback") {
    return <SolarisFallbackCanvas mode={mode} intensity={intensity} />;
  }

  return <SolarisWebGLCanvas mode={mode} intensity={intensity} audioLevel={audioLevel} onUnavailable={handleUnavailable} />;
}

export default function App() {
  const [activeMode, setActiveMode] = useState(0);
  const [intensity, setIntensity] = useState(62);
  const [audioOn, setAudioOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const mode = modes[activeMode];
  const audioRef = useRef<AudioRig | null>(null);
  const openingRef = useRef<HTMLElement>(null);
  const rootStyle = { "--accent": mode.accent, "--accent-rgb": mode.rgb } as CSSProperties;

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.gain.gain.cancelScheduledValues(audio.context.currentTime);
    audio.gain.gain.linearRampToValueAtTime(0, audio.context.currentTime + 0.25);
    audio.oscillator.stop(audio.context.currentTime + 0.3);
    void audio.context.close();
    audioRef.current = null;
    setAudioOn(false);
    setAudioLevel(0);
  }, []);

  const startAudio = useCallback(() => {
    const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = new AudioContextConstructor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    oscillator.type = "sine";
    oscillator.frequency.value = mode.frequency;
    gain.gain.value = 0;
    oscillator.connect(gain);
    gain.connect(analyser).connect(context.destination);
    oscillator.start();
    void context.resume();
    gain.gain.linearRampToValueAtTime(0.045, context.currentTime + 0.8);
    audioRef.current = { context, oscillator, gain, analyser };
    setAudioOn(true);
  }, [mode.frequency]);

  useEffect(() => {
    if (!audioOn) return;

    const audioAnalyser = audioRef.current?.analyser;
    if (!audioAnalyser) return;
    const analyser: AnalyserNode = audioAnalyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    let frameId = 0;

    function sampleAudio() {
      analyser.getByteFrequencyData(data);
      let total = 0;
      for (let index = 0; index < data.length; index += 1) total += data[index];
      setAudioLevel(Math.min(1, (total / data.length / 255) * 3.4));
      frameId = window.requestAnimationFrame(sampleAudio);
    }

    sampleAudio();
    return () => window.cancelAnimationFrame(frameId);
  }, [audioOn]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.oscillator.frequency.cancelScheduledValues(audio.context.currentTime);
    audio.oscillator.frequency.linearRampToValueAtTime(mode.frequency, audio.context.currentTime + 0.45);
  }, [mode]);

  useEffect(() => () => stopAudio(), [stopAudio]);

  useEffect(() => {
    function syncFullscreenState() {
      setImmersive(document.fullscreenElement === openingRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (immersive) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [immersive]);

  async function toggleImmersive() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (immersive) {
        setImmersive(false);
      } else {
        setImmersive(true);
        await openingRef.current?.requestFullscreen();
      }
    } catch {
      setImmersive(true);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;

      if (event.key === " ") {
        event.preventDefault();
        if (audioOn) stopAudio();
        else startAudio();
      }
      if (event.key === "ArrowRight") setActiveMode((value) => (value + 1) % modes.length);
      if (event.key === "ArrowLeft") setActiveMode((value) => (value - 1 + modes.length) % modes.length);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [audioOn, startAudio, stopAudio]);

  return (
    <div className="solaris-app" style={rootStyle}>
      <div className="solaris-haze haze-one" aria-hidden="true" />
      <div className="solaris-haze haze-two" aria-hidden="true" />

      <header className="solaris-header">
        <a className="solaris-logo" href={import.meta.env.BASE_URL} aria-label="Solaris, início">
          <span className="solar-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>SOLARIS</span>
        </a>
        <p className="header-tagline">an instrument for attention</p>
        <div className="header-right">
          <span className="online-label"><i /> live / local</span>
          <button className="header-help" type="button" aria-label="Sobre o instrumento">?</button>
        </div>
      </header>

      <main>
        <section ref={openingRef} className={`opening ${immersive ? "is-immersive" : ""}`} aria-labelledby="opening-title">
          <div className="opening-copy">
            <p className="opening-kicker">An interactive light study <span>↘</span></p>
            <h1 id="opening-title" aria-label="Move through light.">Move<br /><em>through light.</em></h1>
            <p className="opening-description">A small digital instrument for finding rhythm in the space between a gesture and its echo.</p>
            <div className="opening-instruction">
              <span className="instruction-glyph" aria-hidden="true"><i /><i /><i /></span>
              <span>Move across the field.<br />Let the shape find you.</span>
            </div>
          </div>

          <div className="composition-wrap">
            <div className="composition-label"><span>composition / {mode.name}</span><span className="renderer-label">webgl / 3d</span><span>{mode.descriptor}</span></div>
            <div className="composition-frame">
              <SolarisCanvas mode={mode} intensity={intensity / 100} audioLevel={audioLevel} />
              <div className="orb-readout" aria-hidden="true"><span>field response</span><strong>3D / live</strong></div>
              <button className="immersive-control" type="button" aria-pressed={immersive} onClick={toggleImmersive}>
                <span className="immersive-glyph" aria-hidden="true"><i /><i /></span>
                <span>{immersive ? "exit full field" : "enter full field"}</span>
              </button>
              <div className="frame-corner corner-top" aria-hidden="true" />
              <div className="frame-corner corner-bottom" aria-hidden="true" />
              <div className="composition-caption"><span>your gesture is the input</span><span>move / click to pulse</span></div>
            </div>
          </div>
        </section>

        <section className="instrument-panel" aria-labelledby="instrument-title">
          <div className="instrument-intro">
            <p>the instrument</p>
            <h2 id="instrument-title">Give it a rhythm.</h2>
          </div>
          <div className="instrument-controls">
            <div className="mode-row">
              <span className="control-label">palette</span>
              <div className="mode-buttons" role="group" aria-label="Escolha uma paleta">
                {modes.map((item, index) => (
                  <button className={activeMode === index ? "selected" : ""} type="button" key={item.name} onClick={() => setActiveMode(index)}>
                    <i style={{ backgroundColor: item.accent }} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="intensity-control">
              <span className="control-label">intensity</span>
              <input aria-label="intensity" type="range" min="20" max="100" value={intensity} onChange={(event) => setIntensity(Number(event.target.value))} />
              <output>{intensity}%</output>
            </label>
            <button className={`sound-control ${audioOn ? "playing" : ""}`} type="button" aria-pressed={audioOn} onClick={() => (audioOn ? stopAudio() : startAudio())}>
              <span className="sound-icon" aria-hidden="true"><i /><i /><i /><i /></span>
              <span>{audioOn ? "sound on" : "add sound"}</span>
              <small>{audioOn ? "click to mute" : "optional"}</small>
            </button>
          </div>
          <div className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> change palette <span>•</span> <kbd>space</kbd> sound</div>
        </section>

        <section className="afterglow" aria-label="Sobre o Solaris">
          <div className="afterglow-quote">“The best interfaces make room for something else to happen.”</div>
          <div className="afterglow-copy"><p>Solaris is a study in responsive presence — a quiet place where interface becomes atmosphere, and a single gesture is enough to change the whole sky.</p><span>built with webgl / audio / curiosity</span></div>
        </section>
      </main>

      <footer className="solaris-footer"><span>solaris / 001</span><span>no accounts · no feed · no noise</span><span>© 2026</span></footer>
    </div>
  );
}
