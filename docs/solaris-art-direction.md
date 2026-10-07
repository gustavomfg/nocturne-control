# Solaris — opening artwork

Tool: Blender 5.2 Eevee, scripted with Python.

Project asset: `public/images/solaris-blender.webp` (1920 × 1080). Rendered in Blender Eevee from the editable `tools/solaris-sculpture.blend` scene using `tools/solaris_blender_scene.py`. A 52 mm lens, f/3.2 depth of field and horizontal camera shift frame the sculpture beside the opening typography. Ivory key light, silver edge light and amber backlight separate the folds.

SculptureStage.tsx draws the exported glTF (`public/3d/solaris-sculpture.glb`) in WebGL2 with the same Blender materials: bronze and amber metal, ivory softbox reflections, and a bloom pass for the hot highlights. The pointer leaves a wake that dissolves the surface locally, a tap disperses the matter, and dragging spins it with inertia. On first view the sculpture materializes out of dust. In the passage, scroll takes it from whole (Origem) through dust (Ruptura) to a new orientation (Reencontro). The still render stays as the poster and the no-WebGL fallback, and reduced motion shows the settled model. The studio keeps its own Canvas 2D compositions.

## Scene brief

The procedural scene builds two beveled ribbon meshes, tilted orbit curves, an amber/ivory metallic palette, a reflective obsidian floor, and an 86-mote emissive cloud. The camera keeps the mass on the center-right so the opening copy remains legible on the left. Re-run `blender --background --python tools/solaris_blender_scene.py` after changing the scene brief or the source `.blend`. The same run renders the still and exports the sculpture objects (the two ribbons and both orbit rings, without the floor, motes or lights) to `public/3d/solaris-sculpture.glb`.
