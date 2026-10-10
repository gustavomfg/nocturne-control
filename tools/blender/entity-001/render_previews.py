"""Cinematic preview renders of ENTITY 001 (no bloom, no post-processing).

Run:  blender -b assets/source/entity-001/entity-001.blend --python render_previews.py -- [shot ...] [--frame CLIP:FRAME]
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402

TARGET = Vector((0, 0.0, 1.62))
SHOTS = {
    # name: (camera position, look-at, focal length mm)
    "hero": ((-0.62, -1.02, 1.80), (0.0, 0.0, 1.64), 58),
    "front": ((0.0, -1.55, 1.70), (0.0, 0.0, 1.58), 50),
    "profile": ((1.45, 0.0, 1.68), (0.0, 0.03, 1.58), 50),
    "rear": ((0.95, 1.05, 1.92), (0.0, 0.05, 1.66), 50),
    "eye": ((-0.18, -0.62, 1.74), (0.0, -0.1, 1.71), 85),
    "bust": ((-0.9, -2.1, 1.55), (0.0, 0.0, 1.42), 45),
}


def look(obj, target):
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def area(name, location, energy, color, size, target=TARGET):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    look(obj, target)
    return obj


def stage(width=1600, height=900, samples=96):
    scene = bpy.context.scene
    # Lights are created once per session; stage() is called for every frame.
    if bpy.data.objects.get("KEY") is None:
        # Key: warm-neutral, high and to the side, carves the mask and crown.
        area("KEY", (-1.35, -0.9, 2.55), 150, (1.0, 0.9, 0.78), 0.55)
        # Rims: cold, behind, so the silhouette survives in shadow.
        area("RIM_L", (1.15, 1.2, 2.0), 520, (0.58, 0.74, 0.86), 0.35)
        area("RIM_R", (-1.25, 1.05, 1.75), 260, (0.58, 0.74, 0.86), 0.3)
        # Low fill: barely there, keeps the jaw from vanishing.
        area("FILL", (0.5, -1.5, 1.0), 6, (0.9, 0.85, 0.8), 2.0)
    world = scene.world or bpy.data.worlds.new("void")
    scene.world = world
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    background = tree.nodes.new("ShaderNodeBackground")
    output = tree.nodes.new("ShaderNodeOutputWorld")
    output.is_active_output = True
    tree.links.new(background.outputs["Background"], output.inputs["Surface"])
    background.inputs["Color"].default_value = C.srgb("#030304")
    background.inputs["Strength"].default_value = 1.0
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = samples
    if hasattr(scene.eevee, "use_raytracing"):
        scene.eevee.use_raytracing = True
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 90
    cam = bpy.data.objects.get("PREVIEW_CAM")
    if cam is None:
        cam = bpy.data.objects.new("PREVIEW_CAM", bpy.data.cameras.new("PREVIEW_CAM"))
        scene.collection.objects.link(cam)
    scene.camera = cam
    return cam


def render(shot, out_name=None, frame=None):
    scene = bpy.context.scene
    cam = stage(scene.render.resolution_x if out_name and out_name.startswith("frames") else 1600,
                scene.render.resolution_y if out_name and out_name.startswith("frames") else 900,
                32 if out_name and out_name.startswith("frames") else 96)
    pos, target, lens = SHOTS[shot]
    cam.location = pos
    cam.data.lens = lens
    cam.data.dof.use_dof = shot in ("hero", "eye")
    # Focus on the pupil: the eye is where the audience looks.
    cam.data.dof.focus_object = bpy.data.objects.get("CTRL_PUPIL")
    cam.data.dof.aperture_fstop = 2.8 if shot == "eye" else 4.0
    look(cam, target)
    scene = bpy.context.scene
    if frame is not None:
        scene.frame_set(frame)
    os.makedirs(C.PREVIEW_DIR, exist_ok=True)
    scene.render.filepath = os.path.join(C.PREVIEW_DIR, (out_name or shot) + ".jpg")
    bpy.ops.render.render(write_still=True)
    print("rendered", scene.render.filepath)


def solo_clip(clip):
    """Play one clip: unmute its NLA tracks, mute every other track."""
    for o in bpy.data.objects:
        if o.animation_data:
            for track in o.animation_data.nla_tracks:
                track.mute = track.name != clip


def clip_sheet(clip, shot, times, width=800, height=450):
    """Render a few moments of a clip; returns the image paths."""
    solo_clip(clip)
    scene = bpy.context.scene
    paths = []
    for t in times:
        name = f"{clip.lower()}_{shot}_{t:05.2f}".replace(".", "_")
        cam = stage(width, height, samples=32)
        render(shot, os.path.join("frames", name), frame=round(t * C.FPS))
        paths.append(os.path.join(C.PREVIEW_DIR, "frames", name + ".jpg"))
    scene.render.resolution_x, scene.render.resolution_y = 1600, 900
    return paths


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if argv and argv[0] == "--clip":
        clip, shot, *times = argv[1:]
        clip_sheet(clip, shot, [float(t) for t in times])
    else:
        for shot in argv or list(SHOTS):
            render(shot)
