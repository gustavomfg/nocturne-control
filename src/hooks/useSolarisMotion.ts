import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { RefObject } from "react";

if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

type MotionRoot = RefObject<HTMLElement | null>;

export function useSolarisMotion(rootRef: MotionRoot) {
  useGSAP((_, contextSafe) => {
    const root = rootRef.current;
    if (!root || typeof window.matchMedia !== "function") return;

    const motionMedia = gsap.matchMedia();

    motionMedia.add(
      {
        desktop: "(min-width: 900px)",
        finePointer: "(pointer: fine)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (matchContext) => {
        const { desktop = false, finePointer = false, reduceMotion = false } = matchContext.conditions ?? {};
        if (reduceMotion) return;

        const entry = gsap.timeline({ defaults: { ease: "expo.out" } });
        entry
          .from(".site-header", { y: -22, duration: 0.8 })
          .from(".hero-overline", { y: 20, autoAlpha: 0, duration: 0.55 }, "-=0.4")
          .from(".hero-copy h1", { y: 82, rotationX: -16, transformOrigin: "left top", duration: 1.05 }, "-=0.22")
          .from(".hero-lede", { y: 28, autoAlpha: 0, duration: 0.65 }, "-=0.68")
          .from(".hero-prompt, .hero-link", { y: 22, autoAlpha: 0, stagger: 0.1, duration: 0.6 }, "-=0.46")
          .from(".hero-stage-shell", { y: 70, scale: 0.92, rotation: 1.4, duration: 1.25 }, "-=0.9");

        ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => root.style.setProperty("--scroll-progress", self.progress.toFixed(4)),
        });

        gsap.to(".hero-copy", {
          x: desktop ? -42 : 0,
          y: desktop ? -126 : -42,
          rotation: desktop ? -1.8 : 0,
          scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
        });

        gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1.2 } })
          .to(".hero-stage-shell", { y: desktop ? 138 : 54, scale: desktop ? 1.045 : 1.018, rotation: desktop ? 1.2 : 0 }, 0);

        gsap.from(".control-lead", {
          x: -38,
          duration: 0.85,
          scrollTrigger: { trigger: ".control-deck", start: "top 72%", toggleActions: "play none none reverse" },
        });
        gsap.from(".control-console", {
          x: 42,
          duration: 0.9,
          scrollTrigger: { trigger: ".control-deck", start: "top 72%", toggleActions: "play none none reverse" },
        });

        const sequence = root.querySelector<HTMLElement>(".sequence");
        if (sequence) {
          const sequenceTimeline = gsap.timeline({
            scrollTrigger: { trigger: sequence, start: "top top", end: "bottom top", scrub: 1.15 },
          });
            sequenceTimeline
            .to(".sequence-stage", { rotation: 26, rotationX: 9, scale: 1.18, x: desktop ? 18 : 0 }, 0)
            .to(".sequence-orbit--outer", { rotation: 150 }, 0)
            .to(".sequence-core", { scale: 1.5, rotation: -32, duration: 1 }, 0.18)
            .to(".sequence-aura", { scale: 1.55, autoAlpha: 1, duration: 1.2 }, 0.1);

          gsap.utils.toArray<HTMLElement>(".sequence-step", sequence).forEach((step) => {
            ScrollTrigger.create({
              trigger: step,
              start: "top 70%",
              end: "bottom 35%",
              onToggle: (self) => step.classList.toggle("is-active", self.isActive),
            });
          });

          gsap.from(".sequence-copy > *", {
            y: 30,
            stagger: 0.08,
            duration: 0.72,
            scrollTrigger: { trigger: sequence, start: "top 74%", toggleActions: "play none none reverse" },
          });
        }

        gsap.from(".finale > *", {
          y: 42,
          stagger: 0.1,
          duration: 0.9,
          scrollTrigger: { trigger: ".finale", start: "top 74%", toggleActions: "play none none reverse" },
        });

        if (finePointer) {
          const surface = root.querySelector<HTMLElement>(".hero-canvas-surface");
          const stage = root.querySelector<HTMLElement>(".hero-stage");
          if (surface && stage) {
            const tiltX = surface ? gsap.quickTo(surface, "rotationX", { duration: 0.72, ease: "power3.out" }) : null;
            const tiltY = surface ? gsap.quickTo(surface, "rotationY", { duration: 0.72, ease: "power3.out" }) : null;
            const tiltScaleX = surface ? gsap.quickTo(surface, "scaleX", { duration: 0.72, ease: "power3.out" }) : null;
            const tiltScaleY = surface ? gsap.quickTo(surface, "scaleY", { duration: 0.72, ease: "power3.out" }) : null;

            const rawPointerMove = (event: PointerEvent) => {
              if (event.target instanceof Node && stage.contains(event.target)) {
                const bounds = stage.getBoundingClientRect();
                const x = (event.clientX - bounds.left) / bounds.width - 0.5;
                const y = (event.clientY - bounds.top) / bounds.height - 0.5;
                tiltX?.(-y * 12);
                tiltY?.(x * 16);
                tiltScaleX?.(1.025);
                tiltScaleY?.(1.025);
              } else {
                tiltX?.(0);
                tiltY?.(0);
                tiltScaleX?.(1);
                tiltScaleY?.(1);
              }
            };
            const rawPointerLeave = () => {
              tiltX?.(0);
              tiltY?.(0);
              tiltScaleX?.(1);
              tiltScaleY?.(1);
            };
            const handlePointerMove = contextSafe ? contextSafe(rawPointerMove) : rawPointerMove;
            const handlePointerLeave = contextSafe ? contextSafe(rawPointerLeave) : rawPointerLeave;
            window.addEventListener("pointermove", handlePointerMove);
            window.addEventListener("pointerleave", handlePointerLeave);
            return () => {
              window.removeEventListener("pointermove", handlePointerMove);
              window.removeEventListener("pointerleave", handlePointerLeave);
            };
          }
        }

        return undefined;
      },
      root,
    );

    return () => motionMedia.revert();
  }, { scope: rootRef });
}
