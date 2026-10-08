export type FrameTick = (dt: number, elapsed: number) => void;

// Runs `tick` once per animation frame. The loop stops while the tab is hidden
// or the owner reports it is off screen, and restarts without a time jump.
export function createFrameLoop(tick: FrameTick, maxStep = 1 / 20) {
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  let visible = true;
  let disposed = false;

  const isActive = () => visible && !document.hidden && !disposed;

  function run(now: number) {
    frame = 0;
    const dt = last ? Math.min((now - last) / 1000, maxStep) : 0;
    last = now;
    elapsed += dt;
    tick(dt, elapsed);
    if (isActive()) frame = requestAnimationFrame(run);
  }

  function pause() {
    cancelAnimationFrame(frame);
    frame = 0;
  }

  function resume() {
    if (frame || !isActive()) return;
    last = 0;
    frame = requestAnimationFrame(run);
  }

  function sync() {
    if (isActive()) resume();
    else pause();
  }

  const onVisibilityChange = () => sync();
  document.addEventListener("visibilitychange", onVisibilityChange);

  return {
    start() {
      sync();
    },
    setVisible(value: boolean) {
      visible = value;
      sync();
    },
    dispose() {
      disposed = true;
      pause();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    },
  };
}
