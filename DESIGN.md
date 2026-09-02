---
name: Solaris
product: Solaris — an instrument for attention
description: A light, kinetic WebGL experience with an art-studio sensibility.
colors:
  bg: "#080808"
  surface: "#10100F"
  ink: "#F4F4EF"
  body: "#B8B8B1"
  muted: "#7C7C75"
  canvas: "#090909"
  prism: "#F3F3EE"
  sol: "#DEDDD6"
  violet: "#C9C9CC"
  moss: "#B6B9B2"
typography:
  display:
    fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif'
    fontWeight: 400
  body:
    fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif'
    fontWeight: 400
---

## 1. Direction

Solaris is an experimental digital instrument staged like a small midnight installation. This design system documents a visual test project, not a production product: the page is dark-first, the planet owns the first fold, and every section gives the visitor one clear thing to feel before asking for the next gesture.

## 1.1 Experimental scope

The project is a contained laboratory for testing shader-based 3D, GSAP choreography, scroll-linked composition, pointer response, responsive art direction, accessibility, and PWA packaging. Visual rules may evolve as experiments are evaluated. Avoid adding product-like complexity, account flows, analytics assumptions, or operational promises to the experience.

## 2. Palette

- The page uses a soft black field (`#080808`) with warm white typography (`#F4F4EF`).
- Surfaces stay close to the background (`#10100F`) so borders and light carry the hierarchy.
- Palette states are tonal rather than saturated: mineral white, warm ash, quiet silver, and soft graphite.
- The active tone appears in the canvas frame, controls, marks, and status signals without competing with the composition.

## 3. Typography

- Source Sans 3 carries the whole voice: calm, open, and tactile without becoming ornamental.
- Use sentence case for prose. Reserve uppercase for short system labels and state indicators.
- The display heading uses balanced wrapping and stays within a six-rem ceiling.

## 4. Layout & Surfaces

- One dominant composition per viewport; the first fold is a full-bleed dark stage with an oversized Uranus-like light body.
- The hero intentionally overlaps text and instrument to create depth, while the stage metadata stays structural and sparse.
- Controls are presented as one field console, then the long scroll becomes a sticky orbital sequence.
- Borders are thin and structural. Avoid decorative side rails, nested cards, and generic dashboard modules.

## 5. Interaction & Motion

- Pointer and touch movement shift the 3D camera, deform the banded planet, and wake nearby particles.
- The hero is followed by a long afterimage chapter: a sticky orbital study rotates, scales and changes depth in response to scroll, while each text beat comes into focus at the right moment.
- Palette changes alter the canvas, frame, controls, and audio frequency together.
- Intensity changes the visual energy; sound is off until the visitor explicitly enables it.
- Full field mode removes the surrounding page and lets the composition occupy the viewport; native fullscreen is enhanced with a fixed-position fallback.
- Motion uses an energetic ease-out signature, a dramatic first-load sequence, pointer tilt on the 3D stage, and a continuous WebGL loop for the composition.
- WebGL2 is progressively enhanced with a 2D canvas fallback when the GPU context is unavailable.
- `prefers-reduced-motion` freezes the composition into a composed still and removes decorative looping motion.

## 6. Accessibility

- The canvas has a descriptive accessible label and is not the only way to reach controls.
- All palette and sound states expose focus and pressed feedback.
- Audio is opt-in and labeled optional. The page remains complete when audio is unavailable.
- Focus rings use the current palette accent and remain visible against both page and canvas surfaces.
