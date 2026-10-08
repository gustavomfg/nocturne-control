// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAmbience } from "./audio";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createAmbience", () => {
  it("stays silent and reports failure when Web Audio is unavailable", async () => {
    vi.stubGlobal("AudioContext", undefined);
    const ambience = createAmbience();
    await expect(ambience.start()).resolves.toBe(false);
    expect(() => ambience.pulse()).not.toThrow();
    ambience.dispose();
  });
});
