"""Rebuilds ENTITY 001 from scratch, animates it and exports the web assets.

Run:  blender -b --factory-startup --python export_web.py
Outputs:
  assets/source/entity-001/entity-001.blend     source (cinematic quality)
  public/3d/entity-001/entity-cinematic.glb     desktop
  public/3d/entity-001/entity-optimized.glb     mid-range devices
"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(__file__))
import animate_entity  # noqa: E402
import build_entity  # noqa: E402
import common as C  # noqa: E402

EXPORTS = {
    "cinematic": {"file": "entity-cinematic.glb", "frame_step": 1},
    "optimized": {"file": "entity-optimized.glb", "frame_step": 2},
}


def open_pose_to_three():
    """Rewrite each plate's open pose in Three.js space (Y up, +Z front).

    Blender (x, y, z) -> Three (x, z, -y). Rotation (rx about X, rz about Blender Z)
    becomes Euler(rx, rz, 0) in order "YXZ", which reproduces Rz * Rx.
    """
    for obj in bpy.data.objects:
        pose = obj.get("ovra_open")
        if pose is None:
            continue
        tx, ty, tz, rx, rz = (float(v) for v in pose)
        obj["ovra_open_position"] = [round(tx, 4), round(tz, 4), round(-ty, 4)]
        obj["ovra_open_rotation"] = [round(rx, 4), round(rz, 4), 0.0]
        obj["ovra_open_rotation_order"] = "YXZ"
        del obj["ovra_open"]


def export(quality):
    settings = EXPORTS[quality]
    build_entity.build(quality)
    animate_entity.animate()
    if quality == "cinematic":
        build_entity.save()
    open_pose_to_three()
    os.makedirs(C.PUBLIC_DIR, exist_ok=True)
    path = os.path.join(C.PUBLIC_DIR, settings["file"])
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_extras=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_force_sampling=True,
        export_frame_step=settings["frame_step"],
        export_optimize_animation_size=True,
        export_anim_slide_to_zero=True,
        export_cameras=False,
        export_lights=False,
    )
    print("exported", path, os.path.getsize(path))


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else list(EXPORTS)
    for quality in argv:
        export(quality)
