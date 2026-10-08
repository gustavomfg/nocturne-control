import { gsap } from "gsap";

// Fades an element to `opacity`. The returned promise resolves when the fade ends.
export async function fadeTo(element: Element, opacity: number, duration = 0.8): Promise<void> {
  await gsap.to(element, { opacity, duration, ease: "power2.inOut" });
}
