// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { supportsWebGL2, watchReducedMotion } from "./capabilities";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("supportsWebGL2", () => {
  it("is false when the browser returns no WebGL2 context", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(supportsWebGL2()).toBe(false);
  });

  it("is true and releases the probe context when WebGL2 exists", () => {
    const loseContext = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => ({ loseContext }),
    } as unknown as RenderingContext);
    expect(supportsWebGL2()).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });
});

describe("watchReducedMotion", () => {
  it("reports the current preference and each change until unsubscribed", () => {
    const listeners: (() => void)[] = [];
    const query = {
      matches: true,
      addEventListener: (_: string, listener: () => void) => listeners.push(listener),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("matchMedia", () => query);

    const values: boolean[] = [];
    const stop = watchReducedMotion((value) => values.push(value));
    query.matches = false;
    listeners.forEach((listener) => listener());
    stop();

    expect(values).toEqual([true, false]);
    expect(query.removeEventListener).toHaveBeenCalled();
  });
});
