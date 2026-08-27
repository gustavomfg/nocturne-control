---
name: Solaris
product: Solaris — an instrument for attention
description: A light, kinetic WebGL experience with an art-studio sensibility.
colors:
  bg: "#E9ECEA"
  paper: "#F4F5F1"
  ink: "#11131B"
  body: "#3E4850"
  muted: "#667078"
  canvas: "#10131E"
  prism: "#3656FF"
  sol: "#FF725C"
  violet: "#A67CFF"
  moss: "#76BB38"
typography:
  display:
    fontFamily: '"Bricolage Grotesque", Arial, sans-serif'
    fontWeight: 500
  body:
    fontFamily: '"Source Sans 3", "Helvetica Neue", Arial, sans-serif'
    fontWeight: 400
---

## 1. Direction

Solaris is a digital instrument, not a conventional product shell. The visual system is bright and quiet around a dark canvas, so the visitor's gesture and the generated light remain the focus.

## 2. Palette

- The page uses a neutral, lightly tinted background (`#E9ECEA`) with ink typography (`#11131B`).
- The canvas is a deep blue-black (`#10131E`) so light has physical contrast.
- Palette states are explicit: Prism blue, Sol coral, Violet lavender, and Moss green.
- Accent color belongs to the current state and appears in the canvas frame, controls, marks, and status signals.

## 3. Typography

- Bricolage Grotesque carries the display voice: compact, unusual, and tactile without becoming ornamental.
- Source Sans 3 handles paragraphs and controls for a clear reading rhythm.
- Use sentence case for prose. Reserve uppercase for short system labels and state indicators.
- The display heading uses balanced wrapping and stays within a six-rem ceiling.

## 4. Layout & Surfaces

- One dominant composition per viewport; generous whitespace is part of the instrument.
- The hero is asymmetrical: text on the left, responsive canvas on the right.
- Controls sit in one quiet horizontal instrument strip and collapse into a vertical stack on small screens.
- Borders are thin and structural. Avoid decorative side rails, nested cards, and heavy shadows.

## 5. Interaction & Motion

- Pointer and touch movement shift the 3D camera, deform the orb, and wake nearby particles.
- Palette changes alter the canvas, frame, controls, and audio frequency together.
- Intensity changes the visual energy; sound is off until the visitor explicitly enables it.
- Full field mode removes the surrounding page and lets the composition occupy the viewport; native fullscreen is enhanced with a fixed-position fallback.
- Motion uses short ease-out transitions for controls and a continuous WebGL loop for the composition.
- WebGL2 is progressively enhanced with a 2D canvas fallback when the GPU context is unavailable.
- `prefers-reduced-motion` freezes the composition into a composed still and removes decorative looping motion.

## 6. Accessibility

- The canvas has a descriptive accessible label and is not the only way to reach controls.
- All palette and sound states expose focus and pressed feedback.
- Audio is opt-in and labeled optional. The page remains complete when audio is unavailable.
- Focus rings use the current palette accent and remain visible against both page and canvas surfaces.
