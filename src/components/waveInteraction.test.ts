// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaveInteraction } from "./waveInteraction";

function artwork(bright: (x: number, y: number) => boolean = () => true) {
  const image = document.createElement("img");
  Object.defineProperties(image, { naturalWidth: { value: 100 }, naturalHeight: { value: 100 } });
  const context = {
    drawImage: vi.fn(),
    getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => {
      const data = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const pixel = (y * width + x) * 4;
        data[pixel] = bright(x, y) ? 255 : 0;
        data[pixel + 1] = bright(x, y) ? 175 : 0;
        data[pixel + 2] = bright(x, y) ? 70 : 0;
        data[pixel + 3] = 255;
      }
      return { data };
    }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  const interaction = new WaveInteraction();
  interaction.resize(1000, 1000);
  interaction.setSource(image, 1, 1, 0, 0);
  return { interaction, image, context };
}

afterEach(() => vi.restoreAllMocks());

describe("WaveInteraction", () => {
  it("opens only at the entry point and never bridges separate pointer visits", () => {
    const { interaction } = artwork();
    interaction.move(100, 250, 0);
    expect(interaction.particleCount).toBe(0);
    expect(Array.from(interaction.trails).filter((_value, index) => index % 4 === 2 && _value > 0)).toHaveLength(1);
    expect(interaction.trails[0]).toBeCloseTo(0.1);
    expect(interaction.trails[1]).toBeCloseTo(0.75);
    interaction.leave();
    interaction.move(900, 750, 16);
    expect(interaction.particleCount).toBe(0);
    expect(interaction.trails[0]).toBeCloseTo(0.9);
    expect(interaction.trails[1]).toBeCloseTo(0.25);
  });

  it("samples the image crop with the WebGL Y axis and caches the source readback", () => {
    const { interaction, image, context } = artwork((x, y) => x >= 60 && y < 40);
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    interaction.move(100, 200, 0);
    interaction.move(200, 200, 50);
    expect(interaction.particleCount).toBe(0);
    interaction.reset();
    interaction.setSource(image, 0.4, 0.4, 0.6, 0.6);
    interaction.move(100, 200, 100);
    interaction.move(200, 200, 150);
    expect(interaction.particleCount).toBeGreaterThan(0);
    expect(context.getImageData).toHaveBeenCalledTimes(1);
  });

  it("throws luminous fibers outward, springs them back, then clears the wake", () => {
    const { interaction } = artwork();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    interaction.move(400, 400, 0);
    interaction.move(420, 400, 16);
    const originX = interaction.particles[0], originY = interaction.particles[1];
    for (let frame = 0; frame < 10; frame++) interaction.step(1 / 60);
    const outward = Math.hypot(interaction.particles[0] - originX, interaction.particles[1] - originY);
    expect(outward).toBeGreaterThan(0.035);
    for (let frame = 0; frame < 45; frame++) interaction.step(1 / 60);
    const returning = Math.hypot(interaction.particles[0] - originX, interaction.particles[1] - originY);
    expect(returning).toBeLessThan(outward * 0.3);
    interaction.leave();
    for (let frame = 0; frame < 60; frame++) interaction.step(1 / 60);
    expect(interaction.particleCount).toBe(0);
    expect(interaction.trails.every(value => value === 0)).toBe(true);
  });

  it("bounds the particle budget and does not emit while stationary", () => {
    const { interaction } = artwork();
    interaction.move(100, 500, 0);
    for (let event = 1; event <= 30; event++) interaction.move(event % 2 ? 900 : 100, 500, event * 16);
    expect(interaction.particleCount).toBe(650);
    const buffer = interaction.particles;
    interaction.reset();
    interaction.move(500, 500, 1000);
    for (let event = 1; event <= 30; event++) interaction.move(500, 500, 1000 + event * 16);
    expect(interaction.particleCount).toBe(0);
    expect(interaction.particles).toBe(buffer);
    expect(interaction.particles.every(Number.isFinite)).toBe(true);
  });
});
