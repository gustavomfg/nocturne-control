---
name: Solaris
product: Solaris — o invisível, em movimento
description: Uma experiência de luz, matéria e presença.
colors:
  bg: "#090909"
  surface: "#141310"
  surfaceBright: "#27251f"
  scrollbar: "#6f6555"
  backdrop: "#000b"
  ink: "#f2efe7"
  body: "#bdb6a9"
  muted: "#b0a89a"
  paper: "#e9e5da"
  paperInk: "#292a25"
  light: "#ebd7b5"
  prism: "#f4eee4"
  sol: "#edc291"
  violet: "#cbc5e6"
  moss: "#c3d0af"
typography:
  display:
    fontFamily: '"Source Sans 3", sans-serif'
    fontWeight: 400
  expressive:
    fontFamily: '"Cormorant Garamond", Georgia, serif'
    fontWeight: 400
  body:
    fontFamily: '"Source Sans 3", sans-serif'
    fontWeight: 400
---

# Direction

Solaris is an experimental visual experience, not a commercial platform. The visitor moves from a deliberately composed artwork to a live sculpture, then shapes their own composition. The language of the experience is Brazilian Portuguese.

The active page uses `experience.css`, not the earlier Solaris brand-manual styles. Preserve the existing source files as historical implementation context; do not reintroduce those styles into the active page.

## Narrative

1. **Opening:** a bespoke artwork of illuminated bronze filaments, full-bleed, with one invitation to enter. The authored artwork is animated with a WebGL texture-flow shader: the crest rolls, the fibers undulate, and pointer movement gently shifts the local flow. A pause control sits in the opening footer. Cursor and touch movement open a local wake in the fibers. Small luminous particles are sampled from the source artwork, pushed aside, then spring back. The wake closes behind the gesture; speed controls its strength.
2. **Threshold:** warm paper breaks the darkness and establishes the simple relationship between gesture and response.
3. **Passage:** three scroll-linked acts, Origem, Ruptura, Reencontro. The sculpture is dominant; text stays near the edge. Chapter navigation, scatter, freeze and PNG export remain accessible.
4. **Studio:** the visitor chooses a form and atmosphere, adjusts intensity, scatters the sculpture, pauses it, and enters full-screen. The paper surrounds a single dark stage.
5. **Closing:** a quiet return to the opening material, with a path back to the beginning.

## Art and light

The opening asset is `public/images/solaris-sculpture.webp`, a generated artwork optimized to about 208 KiB. `AnimatedWave.tsx` animates this texture at runtime while retaining the original image as a fallback. Motion freezes when paused, offscreen, or hidden; reduced motion renders an undistorted still. The asset's provenance and generation prompt are recorded in `docs/solaris-art-direction.md`.

Live artwork uses a WebGL ribbon mesh with two-sided material lighting, fine moving filaments, dust and spatial backdrop. Ivory light and bronze shadow create readable mass and depth. Scene selection morphs the same geometry between three forms; pointer motion changes the view and a pulse disperses the structure. The Canvas 2D particle instrument remains the fallback for unavailable or lost WebGL.

## Composition

- No sidebar, dashboard frame or brand-manual sections in the active experience.
- Desktop opening: title and invitation on the left, crest of the artwork toward the right. On mobile, the artwork occupies the upper field and the title sits below its brightest region.
- Sans-serif carries the main statements; the italic serif expresses their softer second phrase. Display size stops at 6rem.
- Paper sections provide contrast between dark scenes. Their controls use dark ink and distinct focus treatment.
- The studio groups choices beside the canvas on desktop and below it on mobile. Its frame reserves space for controls so they do not cover the sculpture.

## Interaction and inclusion

- Audio is silent by default and only begins after explicit activation. Pending audio initialization is deduplicated and cancelled on unmount. Muting fades before closing the context.
- Space and arrow keys act as instrument shortcuts only when the stage itself is focused. Focused buttons retain native keyboard behavior.
- Full-screen has a CSS fallback; Escape exits either form.
- About uses a native modal dialog for focus isolation and restoration.
- A frozen passage keeps image, chapter, title, progress and export filename in sync, even if the visitor scrolls.
- Reduced motion removes decorative movement and keeps still compositions usable. Offscreen and hidden-tab rendering is suspended.
- Mouse, touch and keyboard can reach the core interactions. Visible focus rings remain distinct on both light and dark sections.
