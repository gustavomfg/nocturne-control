"""Render the Solaris opening sculpture with Blender.

Run from the repository root:
    blender --background --python tools/solaris_blender_scene.py

The generated still is used as the texture for the interactive WebGL wave.
The companion .blend file stays editable while this script keeps the render
reproducible for future art direction changes.
"""

from math import cos, pi, sin
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "images" / "solaris-blender.webp"
TAU = pi * 2.0


def look_at(camera, target):
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def material(name, color, metallic=0.0, roughness=0.35, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = next(node for node in mat.node_tree.nodes if node.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.65
    if "Coat Roughness" in shader.inputs:
        shader.inputs["Coat Roughness"].default_value = 0.16
    if emission:
        input_name = "Emission Color" if "Emission Color" in shader.inputs else "Emission"
        shader.inputs[input_name].default_value = (*emission, 1.0)
        if "Emission Strength" in shader.inputs:
            shader.inputs["Emission Strength"].default_value = emission_strength
    return mat


def create_ribbon(name, radius, turns, width, height, phase, mat, steps=280):
    vertices = []
    faces = []
    for i in range(steps + 1):
        t = i / steps
        angle = phase + t * TAU * turns
        center = Vector((
            radius * cos(angle) * (0.84 + 0.12 * sin(angle * 2.0)),
            radius * 0.68 * sin(angle),
            0.30 + height * sin(angle * 1.45 + phase) + 0.16 * cos(angle * 3.0),
        ))
        tangent = Vector((
            -sin(angle) * 0.95,
            cos(angle) * 0.68,
            height * 0.68 * cos(angle * 1.45 + phase),
        )).normalized()
        across = tangent.cross(Vector((0.0, 0.0, 1.0)))
        if across.length < 0.08:
            across = tangent.cross(Vector((0.0, 1.0, 0.0)))
        across.normalize()
        normal = tangent.cross(across).normalized()
        twist = angle * 0.72 + sin(t * TAU * 3.0) * 0.22
        strip = across * cos(twist) + normal * sin(twist)
        edge = normal * sin(angle * 2.0 + phase) * 0.045
        for side in (-1.0, 1.0):
            vertices.append(tuple(center + strip * (side * width * 0.5) + edge))
        if i < steps:
            start = i * 2
            faces.append((start, start + 1, start + 3, start + 2))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    solidify = obj.modifiers.new("quiet thickness", "SOLIDIFY")
    solidify.thickness = 0.025
    bevel = obj.modifiers.new("soft edges", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 3
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


def create_orbit(name, radius, tilt, mat):
    bpy.ops.curve.primitive_bezier_circle_add(radius=radius, location=(0.0, 0.0, 0.35), rotation=(tilt, 0.1, -0.18))
    orbit = bpy.context.object
    orbit.name = name
    orbit.data.bevel_depth = 0.018
    orbit.data.bevel_resolution = 4
    orbit.data.materials.append(mat)
    return orbit


def create_particle_cloud(mat):
    for index in range(86):
        u = (index * 0.61803398875) % 1.0
        angle = index * 2.3999632297
        radius = 1.2 + 1.25 * u
        location = (
            radius * cos(angle) * (0.82 + 0.12 * sin(index)),
            radius * sin(angle) * 0.54,
            0.15 + (u - 0.5) * 1.5 + 0.22 * sin(angle * 2.0),
        )
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.014 + (index % 4) * 0.008, location=location)
        mote = bpy.context.object
        mote.name = f"mote_{index:03d}"
        mote.data.materials.append(mat)


def add_area_light(name, location, energy, color, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.color = color
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, (0.0, 0.0, 0.3))
    return light


def build_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for item in list(block):
            if item.users == 0:
                block.remove(item)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1672
    scene.render.resolution_y = 941
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "WEBP"
    if hasattr(scene.render.image_settings, "quality"):
        scene.render.image_settings.quality = 92
    scene.render.film_transparent = False
    scene.render.filepath = str(OUTPUT)
    scene.render.image_settings.color_mode = "RGB"
    scene.render.resolution_percentage = 100
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.use_file_extension = True

    scene.world.color = (0.004, 0.004, 0.005)
    world = scene.world
    world.use_nodes = True
    background = next(node for node in world.node_tree.nodes if node.type == "BACKGROUND")
    background.inputs["Color"].default_value = (0.004, 0.004, 0.005, 1.0)
    background.inputs["Strength"].default_value = 0.18

    gold = material("Solaris amber", (0.26, 0.075, 0.018), metallic=0.82, roughness=0.22)
    ivory = material("Solaris ivory", (0.72, 0.47, 0.22), metallic=0.62, roughness=0.18)
    glow = material("Solaris motes", (0.18, 0.045, 0.01), metallic=0.1, roughness=0.25, emission=(1.0, 0.18, 0.025), emission_strength=3.8)
    floor_mat = material("Obsidian floor", (0.005, 0.006, 0.007), metallic=0.2, roughness=0.28)

    create_ribbon("amber tide", 1.72, 1.34, 0.72, 0.76, 0.32, gold)
    create_ribbon("ivory echo", 1.42, 1.86, 0.24, 0.44, 2.3, ivory, steps=240)
    create_orbit("tilted orbit", 2.35, 0.86, ivory)
    create_orbit("inner orbit", 1.1, -0.52, gold)
    create_particle_cloud(glow)

    bpy.ops.mesh.primitive_plane_add(size=30, location=(0.0, 0.0, -1.25))
    floor = bpy.context.object
    floor.name = "deep reflection"
    floor.data.materials.append(floor_mat)
    bevel = floor.modifiers.new("floor softness", "BEVEL")
    bevel.width = 0.08
    bevel.segments = 2

    add_area_light("warm key", (3.8, -4.5, 5.6), 920.0, (1.0, 0.35, 0.10), 4.2)
    add_area_light("cool rim", (-4.0, 2.8, 3.4), 680.0, (0.18, 0.35, 1.0), 3.6)
    add_area_light("top glint", (0.0, 1.0, 6.5), 500.0, (1.0, 0.64, 0.28), 2.5)

    camera_data = bpy.data.cameras.new("Solaris camera")
    camera = bpy.data.objects.new("Solaris camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (4.9, -7.6, 3.7)
    camera_data.lens = 56
    camera_data.sensor_width = 36
    look_at(camera, (0.15, 0.0, 0.22))
    scene.camera = camera

    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.view_settings.exposure = 0.25
    scene.view_settings.gamma = 1.0

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "tools" / "solaris-sculpture.blend"))
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    build_scene()
