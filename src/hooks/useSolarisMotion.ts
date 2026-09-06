import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";
if (typeof window !== "undefined" && typeof window.matchMedia === "function") gsap.registerPlugin(useGSAP, ScrollTrigger);
export function useSolarisMotion(root: RefObject<HTMLElement | null>) {
  useGSAP(() => {
    if (!root.current || typeof window.matchMedia !== "function") return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".opening-title", { y: 24, duration: 1.5, ease: "expo.out" });
      gsap.to(".opening-art", { yPercent: 12, ease: "none", scrollTrigger: { trigger: ".opening-scene", start: "top top", end: "bottom top", scrub: 0.8 } });
      gsap.from(".threshold > p", { y: 24, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".threshold", start: "top 85%", once: true } });
    });
    return () => media.revert();
  }, { scope: root });
}
