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

1. **Opening:** a bronze sculpture rendered in real 3D from the Blender scene. It materializes out of dust on first view, full-bleed, with one invitation to enter. The pointer turns it gently; cursor movement leaves a wake that dissolves the surface where it passes and heals behind the gesture; a tap disperses it into embers and dust; dragging spins it with inertia. A pause control sits in the opening footer.
2. **Threshold:** warm paper breaks the darkness and establishes the simple relationship between gesture and response.
3. **Passage:** three scroll-linked acts, Origem, Ruptura, Reencontro. The whole sculpture is shown in Origem, dissolves into particles anchored to its surface in Ruptura, and gathers again in a new orientation in Reencontro. Text stays near the edge. Chapter navigation, scatter, freeze and PNG export remain accessible.
4. **Studio:** the visitor chooses a form and atmosphere, adjusts intensity, scatters the sculpture, pauses it, and enters full-screen. The paper surrounds a single dark stage.
5. **Closing:** a quiet return to the opening material, with a path back to the beginning.

## Art and light

The sculpture is authored in `tools/solaris_blender_scene.py` and exported to `public/3d/solaris-sculpture.glb` (glTF 2.0, PBR materials, node transforms applied at load). `SculptureStage.tsx` draws it with the raw WebGL2 renderer in `src/graphics/`: a metallic-roughness shader lit by a procedural studio environment with ivory, amber and silver light, a noise-driven dissolve whose embers trace the edges, a particle layer sampled from the mesh surface that follows the same current, and a half-resolution bloom. `sculptureMotion.ts` holds the springs, intro, dispersal and wake as plain arithmetic.

The still `public/images/solaris-blender.webp` is the poster while the model loads and the fallback when WebGL2 is unavailable; the closing scene keeps using it. Motion freezes when paused, offscreen, or hidden. Reduced motion shows the settled sculpture without the intro or idle turn. Sound raises the ember glow without changing the composition.

The Canvas 2D particle instrument in the studio and its palette, intensity and scatter controls are unchanged.

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
