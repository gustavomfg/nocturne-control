// Optional ambience built from two detuned sines behind a low-pass filter.
// Nothing plays until `start()` is called from a user gesture, and the whole
// graph is closed again by `stop()` or `dispose()`.
export type Ambience = {
  start(): Promise<boolean>;
  stop(): void;
  // 0 to 1. Opens the filter and lifts the level, so the drone follows the entity's energy.
  setEnergy(value: number): void;
  // A short falling tone used as a cue for dramatic moments.
  pulse(): void;
  dispose(): void;
};

type Graph = { context: AudioContext; master: GainNode; filter: BiquadFilterNode; oscillators: OscillatorNode[] };

export function createAmbience(): Ambience {
  let graph: Graph | null = null;
  let pending: Promise<boolean> | null = null;
  // Bumped by stop(), so a start that is still waiting for resume() cancels itself.
  let generation = 0;
  let energy = 0;

  function build(context: AudioContext): Graph {
    const master = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    filter.Q.value = 3;
    master.gain.value = 0;
    filter.connect(master).connect(context.destination);

    const oscillators = [55, 55.37, 110.6].map((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 2 ? "triangle" : "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(filter);
      oscillator.start();
      return oscillator;
    });

    const now = context.currentTime;
    master.gain.linearRampToValueAtTime(0.05, now + 2.5);
    return { context, master, filter, oscillators };
  }

  return {
    start() {
      if (graph) return Promise.resolve(true);
      if (pending) return pending;
      const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return Promise.resolve(false);

      const requested = generation;
      pending = (async () => {
        let context: AudioContext | null = null;
        try {
          context = new Constructor();
          await context.resume();
          if (requested !== generation) {
            void context.close();
            return false;
          }
          graph = build(context);
          return true;
        } catch {
          if (context) void context.close();
          return false;
        } finally {
          pending = null;
        }
      })();
      return pending;
    },
    stop() {
      generation += 1;
      const current = graph;
      graph = null;
      if (!current) return;
      const now = current.context.currentTime;
      current.master.gain.cancelScheduledValues(now);
      current.master.gain.setValueAtTime(current.master.gain.value, now);
      current.master.gain.linearRampToValueAtTime(0, now + 0.4);
      current.oscillators.forEach((oscillator) => oscillator.stop(now + 0.45));
      window.setTimeout(() => void current.context.close(), 600);
    },
    setEnergy(value) {
      energy = value;
      if (!graph) return;
      const now = graph.context.currentTime;
      graph.filter.frequency.setTargetAtTime(180 + energy * 700, now, 0.2);
    },
    pulse() {
      if (!graph) return;
      const { context } = graph;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(660, now);
      oscillator.frequency.exponentialRampToValueAtTime(82, now + 1.6);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.09 + energy * 0.04, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      oscillator.connect(gain).connect(graph.master);
      oscillator.start(now);
      oscillator.stop(now + 1.9);
    },
    dispose() {
      this.stop();
    },
  };
}
