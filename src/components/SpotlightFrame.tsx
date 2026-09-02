import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

type SpotlightFrameProps = {
  children: ReactNode;
  className?: string;
};

/**
 * A small, dependency-free spotlight surface for the instrument console.
 * It follows the same tactile language as the field without owning content or state.
 */
export function SpotlightFrame({ children, className = "" }: SpotlightFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);

  function updateSpotlight(event: ReactPointerEvent<HTMLDivElement>) {
    const frame = frameRef.current;
    if (!frame) return;

    const bounds = frame.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    frame.style.setProperty("--spotlight-x", `${Math.max(0, Math.min(100, x))}%`);
    frame.style.setProperty("--spotlight-y", `${Math.max(0, Math.min(100, y))}%`);
  }

  function resetSpotlight() {
    const frame = frameRef.current;
    if (!frame) return;

    frame.style.setProperty("--spotlight-x", "50%");
    frame.style.setProperty("--spotlight-y", "50%");
  }

  return (
    <div
      ref={frameRef}
      className={`spotlight-frame ${className}`.trim()}
      onPointerMove={updateSpotlight}
      onPointerLeave={resetSpotlight}
    >
      <span className="spotlight-frame__light" aria-hidden="true" />
      {children}
    </div>
  );
}
