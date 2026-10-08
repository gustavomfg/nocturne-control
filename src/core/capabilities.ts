// Reports whether a WebGL2 context can be created. The probe context is released
// immediately so it does not count against the browser's context limit.
export function supportsWebGL2(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

// Calls `onChange` with the current preference and again whenever it changes.
// Returns a function that stops listening.
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window.matchMedia !== "function") {
    onChange(false);
    return () => {};
  }
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handle = () => onChange(query.matches);
  handle();
  query.addEventListener("change", handle);
  return () => query.removeEventListener("change", handle);
}
