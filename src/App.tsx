import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

import { SpotlightFrame } from "./components/SpotlightFrame.tsx";
import { useSolarisMotion } from "./hooks/useSolarisMotion.ts";
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
  { name: "PRISM", accent: "#f3f3ee", rgb: "243, 243, 238", descriptor: "clear / mineral", frequency: 196 },
  { name: "SOL", accent: "#deddd6", rgb: "222, 221, 214", descriptor: "warm / kinetic", frequency: 164 },
  { name: "VIOLET", accent: "#c9c9cc", rgb: "201, 201, 204", descriptor: "deep / quiet", frequency: 220 },
  { name: "MOSS", accent: "#b6b9b2", rgb: "182, 185, 178", descriptor: "soft / alive", frequency: 146 },
];

const foundationSections = [
  { id: "logo", number: "01", label: "logo" },
  { id: "typography", number: "02", label: "typography" },
  { id: "color", number: "03", label: "color" },
  { id: "photography", number: "04", label: "photography" },
  { id: "campaign", number: "05", label: "campaign" },
  { id: "motion", number: "06", label: "motion" },
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
    let active = true;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function draw(time: number) {
      if (!active) return;
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
      const radius = Math.min(width, height) * 0.22;
      const motionTime = reducedMotion ? 0 : time / 1000;

      context.clearRect(0, 0, width, height);
      context.fillStyle = "#0d0d0c";
      context.fillRect(0, 0, width, height);

      const atmosphere = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height) * 0.72);
      atmosphere.addColorStop(0, `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.16 + intensityRef.current * 0.2})`);
      atmosphere.addColorStop(0.35, `rgba(${color.red}, ${color.green}, ${color.blue}, ${0.04 + intensityRef.current * 0.05})`);
      atmosphere.addColorStop(1, "rgba(13, 13, 12, 0)");
      context.fillStyle = atmosphere;
      context.fillRect(0, 0, width, height);

      context.save();
      context.translate(centerX, centerY);
      context.rotate(-0.18 + (pointer.x - 0.5) * 0.14);
      context.scale(1, 0.22);
      context.beginPath();
      context.ellipse(0, 0, radius * 1.78, radius * 1.78, 0, 0, Math.PI * 2);
      context.strokeStyle = `rgba(230, 230, 224, ${0.38 + intensityRef.current * 0.2})`;
      context.lineWidth = Math.max(1, radius * 0.017);
      context.stroke();
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

      context.globalCompositeOperation = "source-over";
      const planetRed = Math.round(color.red * 0.64 + 112 * 0.36);
      const planetGreen = Math.round(color.green * 0.64 + 112 * 0.36);
      const planetBlue = Math.round(color.blue * 0.64 + 112 * 0.36);
      const planetGradient = context.createRadialGradient(
        centerX - radius * 0.34,
        centerY - radius * 0.4,
        radius * 0.08,
        centerX + radius * 0.46,
        centerY + radius * 0.42,
        radius * 1.24,
      );
      planetGradient.addColorStop(0, "rgba(245, 245, 239, 0.98)");
      planetGradient.addColorStop(0.2, `rgba(${Math.min(255, planetRed + 22)}, ${Math.min(255, planetGreen + 30)}, ${planetBlue}, 0.98)`);
      planetGradient.addColorStop(0.6, `rgba(${planetRed}, ${planetGreen}, ${planetBlue}, 0.96)`);
      planetGradient.addColorStop(0.86, `rgba(${Math.max(2, planetRed - 15)}, ${Math.max(20, planetGreen - 62)}, ${Math.max(40, planetBlue - 50)}, 0.98)`);
      planetGradient.addColorStop(1, "rgba(5, 5, 5, 1)");

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.clip();
      context.fillStyle = planetGradient;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      for (let band = 0; band < 13; band += 1) {
        const bandY = centerY - radius + (band + 0.5) * (radius * 2 / 13);
        const wave = Math.sin(band * 1.7 + motionTime * 0.22) * radius * 0.035;
        context.fillStyle = `rgba(232, 232, 225, ${0.025 + (band % 3) * 0.018 + intensityRef.current * 0.012})`;
        context.fillRect(centerX - radius, bandY + wave, radius * 2, Math.max(1, radius * 0.055));
      }
      context.restore();

      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.strokeStyle = `rgba(230, 230, 223, ${0.3 + intensityRef.current * 0.2})`;
      context.lineWidth = Math.max(1, radius * 0.012);
      context.stroke();

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.clip();
      context.translate(centerX, centerY);
      context.rotate(-0.18 + (pointer.x - 0.5) * 0.14);
      context.scale(1, 0.22);
      context.beginPath();
      context.ellipse(0, 0, radius * 1.78, radius * 1.78, 0, 0, Math.PI * 2);
      context.strokeStyle = "rgba(237, 237, 229, 0.76)";
      context.lineWidth = Math.max(1, radius * 0.014);
      context.stroke();
      context.restore();

      const atmosphereGlow = context.createRadialGradient(centerX - radius * 0.24, centerY - radius * 0.26, radius * 0.4, centerX, centerY, radius * 1.5);
      atmosphereGlow.addColorStop(0, "rgba(241, 241, 232, 0.18)");
      atmosphereGlow.addColorStop(0.7, `rgba(${planetRed}, ${planetGreen}, ${planetBlue}, 0.06)`);
      atmosphereGlow.addColorStop(1, `rgba(${planetRed}, ${planetGreen}, ${planetBlue}, 0)`);
      context.fillStyle = atmosphereGlow;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.48, 0, Math.PI * 2);
      context.fill();

      if (active && !reducedMotion) frameId = window.requestAnimationFrame(draw);
    }

    resize();
    draw(0);
    window.addEventListener("resize", resize);
    if (!reducedMotion) frameId = window.requestAnimationFrame(draw);

    return () => {
      active = false;
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
  vec3 background = vec3(0.008, 0.008, 0.007);
  float vignette = 1.0 - smoothstep(0.2, 1.55, length(centered));
  float heartbeat = 0.5 + 0.5 * sin(u_time * 1.25 + sin(u_time * 0.31) * 0.7);
  float atmosphere = exp(-length(centered) * 2.1) * (0.035 + u_intensity * 0.055 + heartbeat * 0.02 + u_audio * 0.04);
  vec3 color = background * (0.68 + vignette * 0.32) + u_color * atmosphere;
  float radialDistance = length(centered);
  float silhouetteRadius = 0.8 + u_pulse * 0.018 + u_audio * 0.008;
  float edgeHalo = exp(-abs(radialDistance - silhouetteRadius) * 175.0) * (0.08 + heartbeat * 0.08 + u_audio * 0.35);
  color += u_color * edgeHalo;
  color += u_color * exp(-abs(length(centered) - 0.82) * 20.0) * u_pulse * 0.12;

  vec3 origin = vec3(pointer.x * 0.18, -pointer.y * 0.18, 3.18);
  vec3 direction = normalize(vec3(centered * 0.88, -2.0));
  vec3 hitPoint;
  float breathingRadius = 1.04 + heartbeat * 0.028 + u_audio * 0.018 + u_pulse * 0.035;
  float hitDistance = intersectSphere(origin, direction, breathingRadius, hitPoint);

  if (hitDistance > 0.0) {
    vec3 localPoint = hitPoint;
    localPoint.yz = rotate2d(u_pointer.y * 0.34 + u_time * 0.16) * localPoint.yz;
    localPoint.xz = rotate2d(-u_pointer.x * 0.34 - u_time * 0.2) * localPoint.xz;
    vec3 baseNormal = normalize(localPoint);
    float ripple = sin(localPoint.x * 4.0 + u_time * 0.42) * sin(localPoint.z * 5.0 - u_time * 0.3);
    float detail = sin(localPoint.y * 16.0 + localPoint.x * 2.0 + u_time * 0.38);
    vec3 normal = normalize(baseNormal + vec3(ripple * 0.35, detail * 0.28, ripple * 0.2) * (0.014 + u_intensity * 0.018));
    vec3 lightDirection = normalize(vec3(-1.14, 0.48, 0.52));
    vec3 viewDirection = normalize(origin - hitPoint);
    vec3 halfDirection = normalize(lightDirection + viewDirection);
    float lightDot = dot(baseNormal, lightDirection);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float terminator = smoothstep(-0.12, 0.5, lightDot);
    float specular = pow(max(dot(normal, halfDirection), 0.0), 100.0);
    float fresnel = pow(1.0 - max(dot(baseNormal, viewDirection), 0.0), 3.2);
    float latitude = asin(clamp(localPoint.y / breathingRadius, -1.0, 1.0));
    vec3 planetColor = mix(u_color, vec3(0.3, 0.3, 0.29), 0.38);
    float bandWarp = sin(localPoint.x * 4.0 + localPoint.z * 3.0 + u_time * 0.12) * 0.12;
    float bandSignal = 0.5 + 0.5 * sin(latitude * 19.0 + bandWarp * 7.0 + sin(localPoint.x * 5.0) * 0.22);
    float broadBand = 0.5 + 0.5 * sin(latitude * 8.5 + sin(localPoint.z * 3.0) * 0.4);
    float stormTrace = exp(-abs(latitude - 0.2 + sin(localPoint.x * 3.2) * 0.035) * 26.0);
    float auroraTrace = exp(-abs(abs(latitude) - 0.66 + sin(localPoint.x * 2.4 + u_time * 0.5) * 0.04) * 32.0);
    float polarFade = smoothstep(0.5, 0.98, abs(latitude));
    vec3 atmosphericBands = mix(planetColor * 0.08, planetColor * 0.78, bandSignal * 0.5 + broadBand * 0.5);
    atmosphericBands += vec3(0.08, 0.08, 0.075) * stormTrace * (0.25 + u_intensity * 0.3);
    atmosphericBands += vec3(0.16, 0.16, 0.15) * auroraTrace * (0.16 + u_intensity * 0.42 + u_audio * 0.18);
    vec3 nightSurface = planetColor * (0.008 + fresnel * 0.06) + vec3(0.002, 0.002, 0.002);
    vec3 daySurface = atmosphericBands * (0.08 + diffuse * 0.72) * (0.58 + terminator * 0.42);
    daySurface += vec3(0.11, 0.11, 0.1) * polarFade * (0.12 + diffuse * 0.25);
    daySurface += vec3(0.72, 0.72, 0.68) * (specular * 0.34 + fresnel * 0.08);
    vec3 surface = mix(nightSurface, daySurface, terminator);
    float terminatorGlow = exp(-abs(lightDot) * 24.0) * (0.035 + u_intensity * 0.09);
    color += surface * (1.0 - smoothstep(2.2, 3.6, hitDistance));
    color += planetColor * fresnel * (0.08 + u_pulse * 0.34 + u_audio * 0.12);
    color += vec3(0.56, 0.56, 0.52) * terminatorGlow;
    color += vec3(0.9, 0.9, 0.84) * specular * (0.12 + u_pulse * 0.26);
  }

  vec3 ringNormal = normalize(vec3(0.08, 0.94, 0.2));
  float ringPlaneDistance = dot(direction, ringNormal);
  if (abs(ringPlaneDistance) > 0.001) {
    float ringDistance = -dot(origin, ringNormal) / ringPlaneDistance;
    vec3 ringPoint = origin + direction * ringDistance;
    vec3 ringAxis = normalize(vec3(1.0, 0.0, -0.08));
    vec3 ringTangent = normalize(cross(ringNormal, ringAxis));
    vec2 ringCoordinates = vec2(dot(ringPoint, ringAxis), dot(ringPoint, ringTangent));
    float ringRadius = length(ringCoordinates);
    float outerEdge = 1.0 - smoothstep(1.34, 1.39, ringRadius);
    float innerEdge = smoothstep(1.15, 1.19, ringRadius);
    float ringMask = outerEdge * innerEdge;
    float ringTexture = 0.5 + 0.5 * sin(ringRadius * 38.0 + sin(ringRadius * 12.0) * 1.4);
    float ringVisibility = ringDistance > 0.0 && (hitDistance < 0.0 || ringDistance < hitDistance) ? 1.0 : 0.0;
    vec3 ringColor = mix(vec3(0.16, 0.16, 0.15), vec3(0.78, 0.78, 0.72), ringTexture * 0.52);
    color += ringColor * ringMask * ringVisibility * (0.1 + u_intensity * 0.14 + u_audio * 0.1);
  }

  color += u_color * exp(-abs(length(centered) - (1.02 + heartbeat * 0.04)) * 30.0) * (u_pulse * 0.16 + u_audio * 0.08);
  float celestialVisibility = hitDistance > 0.0 ? 0.06 : 1.0;

  for (int index = 0; index < 26; index += 1) {
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
    color += u_color * starGlow * starTwinkle * (0.035 + depth * 0.22) * celestialVisibility;
  }

  for (int index = 0; index < 18; index += 1) {
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
    color += u_color * glow * (0.07 + u_intensity * 0.2 + u_audio * 0.4) * celestialVisibility;
  }

  for (int index = 0; index < 2; index += 1) {
    float satelliteIndex = float(index);
    float satelliteAngle = satelliteIndex / 2.0 * TAU + u_time * (0.18 + satelliteIndex * 0.018);
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
    color += (u_color + vec3(0.16, 0.16, 0.15)) * satelliteGlow * (0.2 + satellitePulse * 0.52 + u_audio * 0.8) * celestialVisibility;

    vec3 trail = satellite - normalize(vec3(-sin(satelliteAngle), 0.0, cos(satelliteAngle))) * 0.16;
    vec3 trailRelative = trail - origin;
    vec2 trailProjected = trailRelative.xy / max(0.3, -trailRelative.z) * 1.62;
    float trailDistance = length(centered - trailProjected);
    float trailGlow = exp(-trailDistance * trailDistance / (satelliteSize * satelliteSize * 4.8));
    color += u_color * trailGlow * (0.03 + satellitePulse * 0.1 + u_audio * 0.16) * celestialVisibility;
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
    let active = true;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
      canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function render(time: number) {
      if (!active) return;
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

      if (active && !reducedMotion) frameId = window.requestAnimationFrame(render);
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
      active = false;
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
  const [pulseCount, setPulseCount] = useState(0);
  const [signalNote, setSignalNote] = useState("field / listening");
  const [activeFoundation, setActiveFoundation] = useState("logo");
  const mode = modes[activeMode];
  const audioRef = useRef<AudioRig | null>(null);
  const openingRef = useRef<HTMLElement>(null);
  const appRef = useRef<HTMLDivElement>(null);
  const rootStyle = { "--accent": mode.accent, "--accent-rgb": mode.rgb } as CSSProperties;

  useSolarisMotion(appRef);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;

    const sections = foundationSections
      .map(({ id }) => document.getElementById(id))
      .filter((section): section is HTMLElement => Boolean(section));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
        if (visible?.target.id) setActiveFoundation(visible.target.id);
      },
      { rootMargin: "-18% 0px -62% 0px", threshold: [0.12, 0.3, 0.6] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToInstrument = useCallback(() => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById("instrument-title")?.scrollIntoView({ behavior });
  }, []);

  const scrollToFoundation = useCallback((id: string) => {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    document.getElementById(id)?.scrollIntoView({ behavior, block: "start" });
  }, []);

  const changeMode = useCallback((index: number) => {
    const nextMode = modes[index];
    if (!nextMode) return;

    setActiveMode(index);
    setSignalNote(`${nextMode.name.toLowerCase()} / tuned`);
  }, []);

  const changeIntensity = useCallback((value: number) => {
    setIntensity(value);
    setSignalNote(`energy / ${value}%`);
  }, []);

  const handleStagePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const stage = event.currentTarget;
    const bounds = stage.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    stage.style.setProperty("--pointer-x", `${Math.max(0, Math.min(100, x))}%`);
    stage.style.setProperty("--pointer-y", `${Math.max(0, Math.min(100, y))}%`);
  }, []);

  const resetStagePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty("--pointer-x", "50%");
    event.currentTarget.style.setProperty("--pointer-y", "50%");
  }, []);

  const registerPulse = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!(event.target instanceof HTMLCanvasElement)) return;

    setPulseCount((count) => count + 1);
    setSignalNote("pulse / received");
  }, []);

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
      if (event.key === "ArrowRight") changeMode((activeMode + 1) % modes.length);
      if (event.key === "ArrowLeft") changeMode((activeMode - 1 + modes.length) % modes.length);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeMode, audioOn, changeMode, startAudio, stopAudio]);

  return (
    <div ref={appRef} className={`solaris-site ${immersive ? "is-immersive" : ""}`} style={rootStyle}>
      <div className="site-glow site-glow--one" aria-hidden="true" />
      <div className="site-glow site-glow--two" aria-hidden="true" />
      <div className="scroll-progress" aria-hidden="true"><span /></div>

      <aside className="foundations-index" aria-label="Índice de fundamentos">
        <div className="foundations-index__brand"><span>SR</span><span>foundations</span></div>
        <nav>
          {foundationSections.map((section) => (
            <a
              className={activeFoundation === section.id ? "is-active" : ""}
              href={`#${section.id}`}
              key={section.id}
              onClick={(event) => {
                event.preventDefault();
                scrollToFoundation(section.id);
              }}
            >
              <span>{section.number}</span>
              <span>{section.label}</span>
            </a>
          ))}
        </nav>
        <span className="foundations-index__hint">scroll / explore</span>
      </aside>

      <header className="site-header">
        <a className="solaris-logo" href={import.meta.env.BASE_URL} aria-label="Solaris, início">
          <span className="solar-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>SOLARIS</span>
        </a>
        <p className="header-tagline">foundations / an instrument for attention</p>
        <div className="header-right">
          <span className="online-label"><i /> live / local</span>
          <button className="header-help" type="button" aria-label="Abrir controles do instrumento" onClick={scrollToInstrument}>?</button>
        </div>
      </header>

      <main>
        <section ref={openingRef} className={`hero ${immersive ? "is-immersive" : ""}`} aria-labelledby="opening-title">
          <div className="hero-copy">
            <div className="hero-overline"><span>SOLARIS FOUNDATIONS</span><span>field note / 001</span></div>
            <h1 id="opening-title" aria-label="Move through light."><span>Move</span><span>through <em>light.</em></span></h1>
            <p className="hero-lede">A living light instrument for the space between your gesture and its echo.</p>
            <div className="hero-prompt"><span className="prompt-dot" aria-hidden="true" /><span>Move across the field.<br />Let the shape find you.</span></div>
            <a className="hero-link" href="#color"><span>tune the field</span><b aria-hidden="true">↘</b></a>
          </div>

          <div className="hero-stage-shell">
            <div className="hero-stage-head"><span>composition / {mode.name}</span><span>{mode.descriptor}</span></div>
            <div className="hero-stage" onPointerMove={handleStagePointerMove} onPointerLeave={resetStagePointer} onPointerDown={registerPulse}>
              <div className="stage-spotlight" aria-hidden="true" />
              <div className="stage-crosshair" aria-hidden="true" />
              <div className="stage-traces" aria-hidden="true">
                <span className="stage-trace stage-trace--one" />
                <span className="stage-trace stage-trace--two" />
                <span className="stage-trace stage-trace--three" />
              </div>
              <div className="stage-readout" aria-live="polite">
                <span className="stage-readout-dot" aria-hidden="true" />
                <span>{signalNote}</span>
                <strong>pulse {String(pulseCount).padStart(3, "0")}</strong>
              </div>
              <div className="hero-canvas-surface">
                <SolarisCanvas mode={mode} intensity={intensity / 100} audioLevel={audioLevel} />
              </div>
              <button className="immersive-control" type="button" aria-pressed={immersive} onClick={toggleImmersive}>
                <span className="immersive-glyph" aria-hidden="true"><i /><i /></span>
                <span>{immersive ? "exit full field" : "enter full field"}</span>
              </button>
              <div className="hero-stage-foot"><span>your gesture is the input · click to pulse</span><span>{intensity}% field</span></div>
            </div>
          </div>

          <a className="hero-scroll" href="#color" aria-label="Descer até o console do instrumento"><span>scroll to enter</span><i aria-hidden="true" /></a>
        </section>

        <section className="overdrive-sequence" aria-labelledby="overdrive-title">
          <div className="overdrive-intro">
            <p className="overdrive-intro__label">the overdrive study / 003 gestures</p>
            <h2 id="overdrive-title">Make the quiet impossible to ignore.</h2>
            <p>Three ways to push the same signal past the expected: eclipse, choreography, poster.</p>
          </div>
          <div className="overdrive-triptych">
            <a className="overdrive-panel overdrive-panel--eclipse" href="#photography">
              <span className="overdrive-panel__meta"><b>01</b><span>eclipse / atmosphere</span></span>
              <span className="overdrive-eclipse" aria-hidden="true"><i /><i /></span>
              <span className="overdrive-panel__title">Hold the gaze.</span>
              <span className="overdrive-panel__arrow" aria-hidden="true">↗</span>
            </a>
            <a className="overdrive-panel overdrive-panel--signal" href="#motion">
              <span className="overdrive-panel__meta"><b>02</b><span>signal / response</span></span>
              <span className="overdrive-signal" aria-hidden="true"><i /><i /><i /><i /><i /></span>
              <span className="overdrive-panel__title">Move first.</span>
              <span className="overdrive-panel__arrow" aria-hidden="true">↗</span>
            </a>
            <a className="overdrive-panel overdrive-panel--poster" href="#campaign">
              <span className="overdrive-panel__meta"><b>03</b><span>poster / declaration</span></span>
              <span className="overdrive-poster" aria-hidden="true">MAKE<br /><em>ROOM.</em></span>
              <span className="overdrive-panel__title">Leave a trace.</span>
              <span className="overdrive-panel__arrow" aria-hidden="true">↗</span>
            </a>
          </div>
        </section>

        <section className="foundation-panel foundation-panel--logo" id="logo" aria-labelledby="logo-title">
          <div className="foundation-panel__meta"><span>01</span><span>logo / the mark</span><span>always in motion</span></div>
          <div className="logo-study">
            <div className="logo-study__mark" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            <span className="logo-study__word">SOLARIS</span>
          </div>
          <div className="foundation-panel__copy">
            <p className="section-kicker">the signature</p>
            <h2 id="logo-title">A mark that keeps a pulse.</h2>
            <p>Solaris is a signal before it is a name. The mark stays compact, quiet and a little alive — a small rhythm you can recognize from a distance.</p>
            <span className="foundation-note">clear space / generous<br />scale / never crowded</span>
          </div>
        </section>

        <section className="foundation-panel foundation-panel--type" id="typography" aria-labelledby="type-title">
          <div className="foundation-panel__meta"><span>02</span><span>typography / the voice</span><span>source sans 3</span></div>
          <div className="type-specimen" aria-label="Espécime tipográfico Solaris">
            <span className="type-specimen__small">Aa / 01—06</span>
            <span className="type-specimen__display">Stay<br /><em>curious.</em></span>
            <div className="type-specimen__rule"><span>regular</span><span>calm, direct, precise</span></div>
          </div>
          <div className="foundation-panel__copy">
            <p className="section-kicker">the voice</p>
            <h2 id="type-title">Soft weight. Clear voice.</h2>
            <p>Words should feel like a hand resting on the table: present, not loud. Large type opens the room; small type gives the experiment a coordinate.</p>
            <span className="foundation-note">one family / many tempos<br />no performance, just presence</span>
          </div>
        </section>

        <section className="control-deck foundation-control-deck" id="color" aria-labelledby="instrument-title">
          <div className="control-lead">
            <p className="section-kicker">03 / the palette</p>
            <h2 id="instrument-title">Shape the signal.</h2>
            <p>Every control changes the atmosphere, not just the color. Find the state that makes you stay.</p>
          </div>
          <SpotlightFrame className="control-console">
            <div className="console-head"><strong>field console</strong><span>local / no memory</span><span>input ready <i /></span></div>
            <div className="console-body">
              <div className="mode-row">
                <span className="control-label">palette</span>
                <div className="mode-buttons" role="group" aria-label="Escolha uma paleta">
                  {modes.map((item, index) => (
                    <button className={activeMode === index ? "selected" : ""} type="button" key={item.name} aria-pressed={activeMode === index} onClick={() => changeMode(index)}>
                      <i style={{ backgroundColor: item.accent }} />
                      <span>{item.name}</span>
                    </button>
                  ))}
                </div>
                <div className="mode-detail" aria-live="polite">
                  <span className="mode-detail-swatch" style={{ backgroundColor: mode.accent }} aria-hidden="true" />
                  <span><strong>{mode.name}</strong><small>{mode.descriptor} · {signalNote}</small></span>
                  <span className="mode-detail-frequency"><b>{mode.frequency}</b> Hz</span>
                </div>
              </div>
              <label className="intensity-control">
                <span className="control-label">intensity</span>
                <input aria-label="intensity" type="range" min="20" max="100" value={intensity} onChange={(event) => changeIntensity(Number(event.target.value))} />
                <output aria-live="polite">{intensity}%</output>
              </label>
              <button className={`sound-control ${audioOn ? "playing" : ""}`} type="button" aria-pressed={audioOn} onClick={() => (audioOn ? stopAudio() : startAudio())}>
                <span className="sound-icon" aria-hidden="true"><i /><i /><i /><i /></span>
                <span>{audioOn ? "sound on" : "add sound"}</span>
                <small>{audioOn ? "click to mute" : "optional"}</small>
              </button>
            </div>
            <div className="keyboard-hint"><span><kbd>←</kbd><kbd>→</kbd> change palette <span>•</span> <kbd>space</kbd> sound</span><span className="console-echo">echo / {String(pulseCount).padStart(3, "0")}</span></div>
          </SpotlightFrame>
        </section>

        <section className="foundation-panel foundation-panel--image" id="photography" aria-labelledby="image-title">
          <div className="foundation-panel__meta"><span>04</span><span>photography / the field</span><span>light is material</span></div>
          <div className="image-study">
            <div className="image-study__frame">
              <div className="image-study__orbit image-study__orbit--one" />
              <div className="image-study__orbit image-study__orbit--two" />
              <div className="image-study__core" />
              <span className="image-study__caption">study 04 / hold the gaze</span>
            </div>
            <div className="image-study__index"><span>analogous / 02</span><span>quiet contrast</span></div>
          </div>
          <div className="foundation-panel__copy">
            <p className="section-kicker">the field</p>
            <h2 id="image-title">Nothing decorative. Everything felt.</h2>
            <p>Our image language stays close to the source: a surface, a shadow, a trace. The Canvas instrument above is the living version of that idea — an image that answers back.</p>
            <span className="foundation-note">soft focus / hard edge<br />leave room for wonder</span>
          </div>
        </section>

        <section className="campaign-panel" id="campaign" aria-labelledby="campaign-title">
          <div className="foundation-panel__meta"><span>05</span><span>campaign / the invitation</span><span>make room</span></div>
          <blockquote id="campaign-title">“The best interfaces make room for something else to happen.”</blockquote>
          <div className="campaign-panel__footer"><span>campaign line / 001</span><span>for the curious / by Solaris</span></div>
        </section>

        <section className="sequence" id="motion" aria-labelledby="echo-title">
          <div className="sequence-sticky">
            <div className="sequence-copy">
              <p className="section-kicker">06 / the motion study</p>
              <h2 id="echo-title">Attention is a moving material.</h2>
              <p>Stay with the response. The field is not waiting for a command — it is learning your tempo.</p>
              <div className="sequence-signature"><span>signal / {mode.name.toLowerCase()}</span><span>response / live</span></div>
            </div>
            <div className="sequence-stage" aria-hidden="true">
              <div className="sequence-aura" />
              <div className="sequence-orbit sequence-orbit--outer"><span /></div>
              <div className="sequence-orbit sequence-orbit--middle"><span /></div>
              <div className="sequence-orbit sequence-orbit--inner"><span /></div>
              <div className="sequence-core"><span /></div>
              <div className="sequence-stage-label"><span>field memory</span><strong>01—03</strong></div>
            </div>
          </div>
          <div className="sequence-steps">
            <article className="sequence-step is-active">
              <span className="step-index">01</span>
              <p className="step-label"><i /> gesture / input</p>
              <h3>Move first.</h3>
              <p>The cursor is not a pointer here. It is pressure, direction, a small change in the weather.</p>
            </article>
            <article className="sequence-step">
              <span className="step-index">02</span>
              <p className="step-label"><i /> tuning / response</p>
              <h3>Find the frequency.</h3>
              <p>Shift the palette or turn the intensity up. Watch the material change before you decide what it means.</p>
            </article>
            <article className="sequence-step">
              <span className="step-index">03</span>
              <p className="step-label"><i /> echo / memory</p>
              <h3>Leave something moving.</h3>
              <p>When you move on, the field keeps a trace — not a record, just enough to make the next gesture feel different.</p>
            </article>
          </div>
        </section>

        <section className="finale" aria-labelledby="finale-title">
          <div className="finale-orbit finale-orbit--one" aria-hidden="true" />
          <div className="finale-orbit finale-orbit--two" aria-hidden="true" />
          <p className="section-kicker">solaris / field note 001</p>
          <h2 id="finale-title">Leave the field changed.</h2>
          <p>{pulseCount > 0 ? `The field has answered ${pulseCount} ${pulseCount === 1 ? "pulse" : "pulses"}.` : "The best interfaces make room for something else to happen."}</p>
          <a href="#opening-title">return to the light <span aria-hidden="true">↗</span></a>
        </section>
      </main>

      <footer className="site-footer"><span>solaris / 001</span><span>no accounts · no feed · no noise</span><span>© 2026</span></footer>
    </div>
  );
}
