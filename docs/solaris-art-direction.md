# Solaris — opening artwork

Tool: Blender 5.2 Eevee, scripted with Python.

Project asset: `public/images/solaris-blender.webp` (1672 × 941, 88316 bytes). Rendered in Blender Eevee from the editable `tools/solaris-sculpture.blend` scene using `tools/solaris_blender_scene.py`.

AnimatedWave.tsx applies real-time WebGL texture flow to make the Blender sculpture roll and breathe, with a cursor wake that parts the surface. A separate particle pass uses colors sampled from luminous source regions; pointer speed drives the scatter, and a damped spring returns the motes. The render preserves object-fit framing, freezes on pause, suspends offscreen rendering, and shows the source artwork when WebGL is unavailable. Reduced motion renders the undistorted source. The passage and studio remain separate three-dimensional compositions.

## Scene brief

The procedural scene builds two beveled ribbon meshes, tilted orbit curves, an amber/ivory metallic palette, a reflective obsidian floor, and an 86-mote emissive cloud. The camera keeps the mass on the center-right so the opening copy remains legible on the left. Re-run `blender --background --python tools/solaris_blender_scene.py` after changing the scene brief or the source `.blend`.
