"""Builds ENTITY 001 — AWAKENING: head, neck, chest and floating parts.

Run:  blender -b --factory-startup --python build_entity.py -- [cinematic|optimized]
Every number below is an art decision; the layout is not random.
"""
import math
import sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, __import__("os").path.dirname(__file__))
import common as C  # noqa: E402

GAP = 0.022            # seam between plates, radians on the shell
EYE_S = 0.03           # height of the eye slit on the face
EYE_HALF_WIDTH = 0.80  # lateral reach of the almond slit (radians)
EYE_HALF_HEIGHT = 0.115

QUALITY = {
    "cinematic": {"density": 30, "bevel_segments": 3, "round": 48, "texture": 512},
    "optimized": {"density": 13, "bevel_segments": 1, "round": 20, "texture": 256},
}

# Rest positions (Blender world space, metres). The figure is ~0.75 m tall.
P = {
    "body": Vector((0, 0, 1.10)),
    "torso": Vector((0, 0.04, 1.10)),
    "core": Vector((0, -0.085, 1.12)),
    "neck1": Vector((0, 0.03, 1.33)),
    "neck2": Vector((0, 0.03, 1.395)),
    "neck3": Vector((0, 0.025, 1.455)),
    "head": Vector((0, 0.02, 1.50)),
    "skull": Vector((0, 0.0, 1.70)),
    "halo": Vector((0, 0.17, 1.80)),
    "float": Vector((0, 0.02, 1.36)),
}


def almond(w):
    """Half height of the eye slit at lateral angle w: an almond, not an ellipse."""
    if abs(w) >= EYE_HALF_WIDTH:
        return 0.0
    return EYE_HALF_HEIGHT * math.cos(abs(w) / EYE_HALF_WIDTH * math.pi / 2) ** 0.55


def brow_top(w):
    """The brow rises toward the midline and flows into the crest."""
    return 0.70 - 0.25 * min(1.0, abs(w) / EYE_HALF_WIDTH) ** 1.6


def muzzle_low(w):
    """The muzzle narrows into a chin point: a shield, not a band."""
    return -0.66 + 0.30 * min(1.0, abs(w) / 0.78) ** 1.3


def crown_low(w):
    return (brow_top(w) if abs(w) < EYE_HALF_WIDTH else 0.45) + GAP


def jaw_top(w):
    return (muzzle_low(w) if abs(w) < 0.78 else -0.36) - GAP


def res(q, w0, w1, s0, s1, radius):
    d = q["density"]
    return (max(4, int(abs(w1 - w0) * d * radius / 0.2)), max(4, int(abs(s1 - s0) * d * radius / 0.2)))


def make_plate(name, shell, mat, parent, col, q, w0, w1, s0, s1, thickness, role="plate", open_pose=None, inset=0.0):
    s0v = s0(0.5 * (w0 + w1)) if callable(s0) else s0
    s1v = s1(0.5 * (w0 + w1)) if callable(s1) else s1
    mesh, _ = C.plate_mesh(name, shell, w0, w1, s0, s1, res(q, w0, w1, s0v, s1v, shell.radii.length / 1.7), inset)
    obj = C.mesh_object(name, mesh, parent, col, mat)
    # Plates pivot on the parent (the hinge axis): keep their origin there.
    C.hard_surface(obj, thickness, 0.0028, q["bevel_segments"])
    obj["ovra_role"] = role
    if open_pose:
        obj["ovra_open"] = open_pose
    return obj


def mirrored(name, shell, mat, parent, col, q, w0, w1, s0, s1, thickness, open_pose=None):
    """Left plate on +X (the character's left), right plate mirrored on -X."""
    left = make_plate(f"{name}_L", shell, mat, parent, col, q, w0, w1, s0, s1, thickness, open_pose=open_pose(+1) if open_pose else None)
    right = make_plate(f"{name}_R", shell, mat, parent, col, q, -w1, -w0, s0, s1, thickness, open_pose=open_pose(-1) if open_pose else None)
    return left, right


def build(quality="cinematic"):
    q = QUALITY[quality]
    C.reset_scene()
    mats = C.build_materials(q["texture"])
    col = C.collection("ENTITY_001")
    rig = C.collection("RIG", col)
    geo = C.collection("GEOMETRY", col)

    root = C.empty("ENTITY_ROOT", (0, 0, 0), col=rig, size=0.3, display="ARROWS")
    root["ovra_role"] = "root"
    body = C.empty("CTRL_BODY", P["body"], root, rig, 0.25, "CUBE")
    torso = C.empty("CTRL_TORSO", P["torso"], body, rig, 0.2)
    core = C.empty("CTRL_CORE", P["core"], torso, rig, 0.06, "SPHERE")
    neck1 = C.empty("CTRL_NECK_01", P["neck1"], torso, rig, 0.08, "CIRCLE")
    neck2 = C.empty("CTRL_NECK_02", P["neck2"], neck1, rig, 0.08, "CIRCLE")
    neck3 = C.empty("CTRL_NECK_03", P["neck3"], neck2, rig, 0.08, "CIRCLE")
    # CTRL_LOOK and CTRL_GAZE are reserved for runtime aiming: no clip animates them,
    # so code can steer the head and eye on top of any playing animation.
    look = C.empty("CTRL_LOOK", P["head"], neck3, rig, 0.18, "SINGLE_ARROW")
    head = C.empty("CTRL_HEAD", P["head"], look, rig, 0.15, "ARROWS")
    skull = C.empty("CTRL_SKULL", P["skull"], head, rig, 0.1, "SINGLE_ARROW")
    gaze = C.empty("CTRL_GAZE", P["skull"], skull, rig, 0.14, "SINGLE_ARROW")
    eye = C.empty("CTRL_EYE", P["skull"], gaze, rig, 0.12, "SINGLE_ARROW")
    halo = C.empty("CTRL_HALO", P["halo"], torso, rig, 0.2, "CIRCLE")
    floats = C.empty("CTRL_FLOAT", P["float"], body, rig, 0.1, "SPHERE")
    for ctrl in (body, torso, core, neck1, neck2, neck3, head, skull, eye, halo, floats):
        ctrl["ovra_role"] = "control"
    for ctrl in (look, gaze):
        ctrl["ovra_role"] = "runtime"
    for obj in (look, gaze, head, eye, neck1, neck2, neck3):
        obj.rotation_mode = "XYZ"

    build_skull(q, mats, skull, eye, geo)
    build_neck(q, mats, (neck1, neck2, neck3), geo)
    build_chest(q, mats, torso, core, geo)
    build_halo(q, mats, halo, geo)
    build_fragments(q, mats, floats, geo)

    for obj in list(geo.all_objects):
        if obj.type == "MESH" and obj.modifiers:
            C.apply_modifiers(obj)
    return {"root": root}


# --------------------------------------------------------------------------- skull

HEAD_SHELL = C.Shell(P["skull"], (0.165, 0.205, 0.215), sweep=0.11, taper=0.32)


def open_rot(rx=0.0, rz=0.0, out=0.0, s_mid=0.0, w_mid=0.0, dx=0.0):
    """Open pose for the TRANSFORM sequence: hinge rotation plus outward travel."""
    n = C.Shell.direction(s_mid, w_mid)
    t = n * out + Vector((dx, 0, 0))
    return [round(t.x, 4), round(t.y, 4), round(t.z, 4), round(rx, 4), round(rz, 4)]


def build_skull(q, m, skull, eye, col):
    sh = HEAD_SHELL
    tit, cer = m["titanium"], m["ceramic"]
    T, TC = 0.010, 0.014
    brow_low = lambda w: EYE_S + almond(w) + GAP
    muzzle_top = lambda w: EYE_S - almond(w) - GAP

    # The ceramic mask: brow and muzzle, cut by the almond slit.
    make_plate("PLATE_BROW", sh, cer, skull, col, q, -EYE_HALF_WIDTH, EYE_HALF_WIDTH, brow_low, brow_top, TC,
               open_pose=open_rot(rx=-0.38, out=0.03, s_mid=0.4))
    make_plate("PLATE_MUZZLE", sh, cer, skull, col, q, -0.78, 0.78, muzzle_low, muzzle_top, TC,
               open_pose=open_rot(rx=0.30, out=0.035, s_mid=-0.3))
    # Temples bridge the mask to the hinge hubs.
    mirrored("PLATE_TEMPLE", sh, tit, skull, col, q, 0.80 + GAP, 1.30, -0.36, 0.45, T,
             open_pose=lambda side: open_rot(rz=0.25 * side, out=0.05, w_mid=1.0 * side, dx=0.03 * side))
    # Crown: a ceramic crest down the midline between titanium bands.
    make_plate("PLATE_CREST_A", sh, cer, skull, col, q, -0.15, 0.15, crown_low, 1.20, TC,
               open_pose=open_rot(rx=-0.55, out=0.05, s_mid=0.9))
    make_plate("PLATE_CREST_B", sh, cer, skull, col, q, -0.12, 0.12, 1.20 + GAP, 1.85, TC,
               open_pose=open_rot(rx=-0.42, out=0.06, s_mid=1.5))
    mirrored("PLATE_CROWN_A", sh, tit, skull, col, q, 0.15 + GAP, 1.30, crown_low, 1.20, T,
             open_pose=lambda side: open_rot(rx=-0.45, rz=0.12 * side, out=0.07, s_mid=0.9, w_mid=0.7 * side))
    mirrored("PLATE_CROWN_B", sh, tit, skull, col, q, 0.12 + GAP, 1.30, 1.20 + GAP, 1.85, T,
             open_pose=lambda side: open_rot(rx=-0.32, rz=0.16 * side, out=0.08, s_mid=1.5, w_mid=0.7 * side))
    mirrored("PLATE_OCCIPUT", sh, tit, skull, col, q, 0.07, 1.30, 1.85 + GAP, 2.45, T,
             open_pose=lambda side: open_rot(rx=-0.2, rz=0.22 * side, out=0.08, s_mid=2.15, w_mid=0.7 * side))
    # The back stays partly open: two frames around a window into the inner skull.
    mirrored("PLATE_REAR_FRAME", sh, tit, skull, col, q, 0.72, 1.30, 2.45 + GAP, 2.95, T,
             open_pose=lambda side: open_rot(rz=0.3 * side, out=0.06, s_mid=2.7, w_mid=1.0 * side))
    make_plate("PLATE_NAPE", sh, tit, skull, col, q, -1.0, 1.0, 2.95 + GAP, 3.55, T,
               open_pose=open_rot(rx=0.25, out=0.05, s_mid=3.25))
    jaw = make_plate("PLATE_JAW", sh, tit, skull, col, q, -1.05, 1.05, -1.25, jaw_top, T, role="jaw",
                     open_pose=open_rot(rx=0.32, out=0.02, s_mid=-0.9))
    add_vents(jaw, sh, m, col)

    # Inner lids sit just under the mask and close the slit by rotating on the hinge.
    lid_up = make_plate("LID_UPPER", sh, tit, skull, col, q, -0.84, 0.84, EYE_S, EYE_S + 0.17, 0.006, role="lid", inset=0.012)
    lid_low = make_plate("LID_LOWER", sh, tit, skull, col, q, -0.84, 0.84, EYE_S - 0.17, EYE_S, 0.006, role="lid", inset=0.012)
    # Built closed; their rest pose is open (hidden behind brow and muzzle).
    lid_up.rotation_euler.x = -0.17
    lid_low.rotation_euler.x = 0.17
    lid_up["ovra_closed_rotation_x"] = 0.0
    lid_low["ovra_closed_rotation_x"] = 0.0

    build_hubs(q, m, skull, col)
    build_inner_skull(q, m, skull, col)
    build_eye(q, m, eye, col)


def add_vents(jaw, shell, m, col):
    """Gill-like vents on both sides of the jaw: five slats that follow the surface."""
    import bmesh
    slats = []
    for side in (1, -1):
        for k in range(5):
            s = -0.50 - k * 0.075
            w = side * (0.80 - k * 0.025)
            point = shell.point(s, w, inset=-0.004)
            normal = shell.normal(s, w)
            slat = C.box_mesh("vent", (0.034, 0.0065, 0.006))
            # Long axis follows w (around the jaw), thin axis along the normal.
            tangent = (shell.point(s, w + 0.01) - shell.point(s, w - 0.01)).normalized()
            basis = Matrix((tangent, normal.cross(tangent), normal)).transposed().to_4x4()
            slat.transform(basis)
            slat.transform(Matrix.Translation(point))
            slat.materials.append(m["inner"])
            slats.append(slat)
    vents = C.mesh_object("geo_jaw_vents", C.join_meshes("geo_jaw_vents", slats), jaw, col)
    vents["ovra_role"] = "static"


def build_hubs(q, m, skull, col):
    meshes = []
    for side in (1, -1):
        center = P["skull"] + Vector((side * (HEAD_SHELL.radii.x - 0.016), 0, 0))
        normal = Vector((side, 0, 0))
        disc = C.place(C.cylinder_mesh("hub_disc", 0.056, 0.02, q["round"]), center, normal)
        disc.materials.append(m["brushed"])
        cap = C.place(C.cylinder_mesh("hub_cap", 0.032, 0.03, q["round"]), center + normal * 0.004, normal)
        cap.materials.append(m["titanium"])
        ring = C.place(C.torus_mesh("hub_signal", 0.042, 0.002, q["round"] * 2, 8), center + normal * 0.0105, normal)
        ring.materials.append(m["frost"])
        meshes += [disc, cap, ring]
        for k in range(6):
            a = k * math.tau / 6 + 0.26
            offset = Matrix.Rotation(a, 3, normal) @ Vector((0, 0.049, 0))
            bolt = C.place(C.cylinder_mesh("bolt", 0.0042, 0.006, 12), center + normal * 0.0105 + offset, normal)
            bolt.materials.append(m["brushed"])
            meshes.append(bolt)
    hub = C.mesh_object("geo_hubs", C.join_meshes("geo_hubs", meshes), skull, col)
    hub["ovra_role"] = "static"
    for poly in hub.data.polygons:
        poly.use_smooth = False


def build_inner_skull(q, m, skull, col):
    inner = C.place(C.ellipsoid_mesh("inner", (0.14, 0.17, 0.18), q["round"], q["round"] // 2), P["skull"] + Vector((0, 0.02, 0.0)))
    inner.materials.append(m["inner"])
    parts = [inner]
    # Ribs around the hinge axis, seen through the seams and the rear window.
    for x in (-0.07, 0.0, 0.07):
        rib = C.torus_mesh("rib", 1.0, 0.006, q["round"] * 2, 8)
        rib.transform(Matrix.Rotation(math.pi / 2, 4, "Y"))
        rib.transform(Matrix.Diagonal((1, 0.172, 0.185, 1)))
        rib.transform(Matrix.Translation(P["skull"] + Vector((x, 0.02, 0))))
        rib.materials.append(m["brushed"])
        parts.append(rib)
    glow = C.place(C.ellipsoid_mesh("head_core", (0.032, 0.032, 0.05), 24, 12), P["skull"] + Vector((0, 0.15, 0.02)))
    glow.materials.append(m["ember"])
    parts.append(glow)
    obj = C.mesh_object("geo_inner_skull", C.join_meshes("geo_inner_skull", parts), skull, col)
    obj["ovra_role"] = "static"
    obj["ovra_emissive_material"] = "M_CoreEmber"


def build_eye(q, m, eye, col):
    """A single lens that travels behind the slit. CTRL_EYE pivots at the skull
    center, so rotating it slides the lens along the almond like an eyeball."""
    front = HEAD_SHELL.point(EYE_S, 0.0, inset=0.028)
    axis = Vector((0, -1, 0))
    housing = C.place(C.cylinder_mesh("eye_housing", 0.05, 0.05, q["round"]), front + Vector((0, 0.03, 0)), axis)
    housing.materials.append(m["inner"])
    socket = C.place(C.torus_mesh("eye_socket", 0.046, 0.0065, q["round"] * 2, 10), front, axis)
    socket.materials.append(m["brushed"])
    backing = C.place(C.ellipsoid_mesh("eye_backing", (0.042, 0.042, 0.01), q["round"], q["round"] // 2), front + Vector((0, 0.004, 0)), axis)
    backing.materials.append(m["lens"])
    lens = C.mesh_object("geo_eye", C.join_meshes("geo_eye", [housing, socket, backing]), eye, col)
    lens["ovra_role"] = "static"

    iris = C.empty("CTRL_IRIS", front + Vector((0, -0.006, 0)), eye, C.collection("RIG"), 0.03, "CIRCLE")
    iris["ovra_role"] = "control"
    blades = []
    for k in range(8):
        a = k * math.tau / 8
        blade = C.box_mesh("blade", (0.026, 0.0035, 0.0018))
        blade.transform(Matrix.Translation((0.0, 0.026, 0)))
        blade.transform(Matrix.Rotation(0.55, 4, "Z"))
        blade.transform(Matrix.Rotation(a, 4, "Z"))
        C.place(blade, front + Vector((0, -0.008, 0)), axis)
        blade.materials.append(m["titanium"])
        blades.append(blade)
    C.mesh_object("geo_iris_blades", C.join_meshes("geo_iris_blades", blades), iris, col)["ovra_role"] = "static"

    pupil = C.empty("CTRL_PUPIL", front + Vector((0, -0.004, 0)), iris, C.collection("RIG"), 0.02, "CIRCLE")
    pupil["ovra_role"] = "control"
    disc = C.place(C.cylinder_mesh("pupil", 0.016, 0.003, q["round"]), front + Vector((0, -0.006, 0)), axis)
    disc.materials.append(m["sensor"])
    # An ember ring warms the stare and ties the eye to the web palette.
    ring = C.place(C.torus_mesh("pupil_ring", 0.0215, 0.0024, q["round"] * 2, 8), front + Vector((0, -0.0065, 0)), axis)
    ring.materials.append(m["ember"])
    glow = C.mesh_object("geo_pupil", C.join_meshes("geo_pupil", [disc, ring]), pupil, col)
    glow["ovra_role"] = "static"
    glow["ovra_emissive_material"] = "M_SensorGlow"


# --------------------------------------------------------------------------- neck

def build_neck(q, m, necks, col):
    for i, node in enumerate(necks):
        base = P[f"neck{i + 1}"]
        disc = C.place(C.cylinder_mesh("vertebra", 0.074 - i * 0.006, 0.026, q["round"]), base)
        disc.materials.append(m["brushed"])
        fins = []
        for side in (1, -1):
            fin = C.box_mesh("fin", (0.034, 0.03, 0.014))
            fin.transform(Matrix.Translation(base + Vector((side * (0.084 - i * 0.006), 0.008, 0))))
            fin.materials.append(m["titanium"])
            fins.append(fin)
        tube = C.place(C.cylinder_mesh("tube", 0.046, 0.07, q["round"] // 2), base + Vector((0, 0, 0.03)))
        tube.materials.append(m["inner"])
        obj = C.mesh_object(f"geo_vertebra_0{i + 1}", C.join_meshes("vertebra", [disc, *fins, tube]), node, col)
        obj["ovra_role"] = "static"


# --------------------------------------------------------------------------- chest

CHEST_SHELL = C.Shell(P["torso"], (0.30, 0.17, 0.23), sweep=0.0, taper=0.18)


def build_chest(q, m, torso, core, col):
    sh = CHEST_SHELL
    tit = m["titanium"]
    T = 0.012
    # Sternum halves leave a seam of light; in TRANSFORM they slide apart.
    make_plate("PLATE_STERNUM_L", sh, tit, torso, col, q, 0.035, 0.48, -0.55, 0.72, T,
               open_pose=[0.07, -0.02, 0.0, 0.0, 0.42])
    make_plate("PLATE_STERNUM_R", sh, tit, torso, col, q, -0.48, -0.035, -0.55, 0.72, T,
               open_pose=[-0.07, -0.02, 0.0, 0.0, -0.42])
    mirrored("PLATE_FLANK", sh, tit, torso, col, q, 0.48 + GAP, 1.28, -0.55, 0.95, T,
             open_pose=lambda side: [0.03 * side, 0.01, 0, 0, 0.15 * side])
    mirrored("PLATE_YOKE", sh, tit, torso, col, q, 0.30, 1.28, 0.95 + GAP, 1.72, T,
             open_pose=lambda side: [0.02 * side, 0, 0.025, 0, 0])
    make_plate("PLATE_BACK", sh, tit, torso, col, q, -1.0, 1.0, 1.72 + GAP, 2.95, T,
               open_pose=[0, 0.03, 0, 0, 0])

    # The inner volume stops short of the sternum so the heart sits in a lit cavity.
    inner = C.place(C.ellipsoid_mesh("chest_inner", (0.26, 0.125, 0.2), q["round"], q["round"] // 2), P["torso"] + Vector((0, 0.035, 0)))
    inner.materials.append(m["inner"])
    collar = C.place(C.torus_mesh("collar", 0.078, 0.013, q["round"] * 2, 12), P["neck1"] + Vector((0, 0, -0.03)))
    collar.materials.append(m["brushed"])
    static = C.mesh_object("geo_chest_inner", C.join_meshes("geo_chest_inner", [inner, collar]), torso, col)
    static["ovra_role"] = "static"

    for side in (1, -1):
        shoulder = C.empty(f"CTRL_SHOULDER_{'L' if side > 0 else 'R'}", Vector((side * 0.36, 0.05, 1.21)), torso, C.collection("RIG"), 0.08)
        shoulder["ovra_role"] = "control"
        shell = C.Shell(Vector((side * 0.36, 0.05, 1.21)), (0.125, 0.14, 0.085))
        w0, w1 = (0.05, 1.3) if side > 0 else (-1.3, -0.05)
        make_plate(f"PLATE_PAULDRON_{'L' if side > 0 else 'R'}", shell, tit, shoulder, col, q, w0, w1, -0.35, 1.15, T,
                   open_pose=[0.04 * side, 0, 0.03, 0, 0.1 * side])
        lw0, lw1 = (0.3, 1.3) if side > 0 else (-1.3, -0.3)
        make_plate(f"PLATE_LAME_{'L' if side > 0 else 'R'}", shell, m["ceramic"], shoulder, col, q, lw0, lw1, -0.95, -0.35 - GAP, 0.012,
                   open_pose=[0.05 * side, 0, -0.02, 0, 0.18 * side])

    # The exposed core: an ember heart inside two gyroscopic rings.
    heart = C.place(C.ellipsoid_mesh("core", (0.03, 0.03, 0.034), q["round"], q["round"] // 2), P["core"])
    heart.materials.append(m["ember"])
    obj = C.mesh_object("geo_core", heart, core, col)
    obj["ovra_role"] = "static"
    obj["ovra_emissive_material"] = "M_CoreEmber"
    for name, radius, tilt in (("GYRO_A", 0.044, (math.pi / 2, 0)), ("GYRO_B", 0.052, (0, math.pi / 2))):
        ring = C.torus_mesh(name, radius, 0.0034, q["round"] * 2, 8)
        ring.transform(Matrix.Rotation(tilt[0], 4, "X") @ Matrix.Rotation(tilt[1], 4, "Y"))
        ring.transform(Matrix.Translation(P["core"]))
        ring.materials.append(m["brushed"])
        gyro = C.mesh_object(name, ring, core, col)
        gyro["ovra_role"] = "mechanism"


# --------------------------------------------------------------------------- halo and fragments

def build_halo(q, m, halo, col):
    """A broken halo behind the head: seven arc shards with deliberate gaps."""
    arcs = [(-0.35, 0.55, "ceramic"), (0.66, 1.05, "titanium"), (1.16, 1.42, "titanium"),
            (1.62, 2.55, "ceramic"), (2.7, 3.05, "titanium"), (3.4, 4.2, "titanium"), (4.45, 5.7, "titanium")]
    tilt = Matrix.Rotation(math.radians(72), 4, "X")
    for k, (a0, a1, mat) in enumerate(arcs):
        mid = 0.5 * (a0 + a1)
        radius = 0.34 + (0.012 if k % 2 else 0)
        mesh = C.torus_mesh(f"halo_{k}", radius, 0.011 if mat == "ceramic" else 0.008,
                            max(6, int((a1 - a0) * q["round"] / 1.6)), 4, arc=(a0, a1), closed=False)
        mesh.transform(Matrix.Diagonal((1, 1, 2.2, 1)))
        center = Vector((radius * math.cos(mid), radius * math.sin(mid), 0))
        mesh.transform(Matrix.Translation(-center))
        world_center = P["halo"] + (tilt @ center.to_4d()).to_3d()
        mesh.transform(tilt)
        mesh.transform(Matrix.Translation(world_center))
        mesh.materials.append(m[mat])
        shard = C.mesh_object(f"HALO_SHARD_0{k + 1}", mesh, halo, col)
        shard.location = world_center - P["halo"]
        shard.data.transform(Matrix.Translation(-(world_center - P["halo"])))
        shard["ovra_role"] = "float"
        for poly in shard.data.polygons:
            poly.use_smooth = False


def build_fragments(q, m, floats, col):
    """Loose chips of the shell, the same flattened octahedra as the web prototype."""
    import bmesh
    spots = [(0.24, -0.06, 0.34, 0.034), (-0.27, 0.0, 0.40, 0.026), (0.33, 0.1, 0.14, 0.022), (-0.36, 0.08, 0.1, 0.03)]
    for k, (x, y, z, size) in enumerate(spots):
        bm = bmesh.new()
        bmesh.ops.create_cone(bm, cap_ends=True, segments=4, radius1=1.0, radius2=0.0, depth=1.0)
        mirror = bmesh.ops.duplicate(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:])
        bmesh.ops.scale(bm, vec=(1, 1, -1), verts=[v for v in mirror["geom"] if isinstance(v, bmesh.types.BMVert)])
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bmesh.ops.scale(bm, vec=(size, size * 0.6, size * 0.28), verts=bm.verts)
        mesh = bpy.data.meshes.new(f"frag_{k}")
        bm.to_mesh(mesh)
        bm.free()
        mesh.transform(Matrix.Rotation(k * 1.3, 4, "Z") @ Matrix.Rotation(0.6 + k * 0.4, 4, "X"))
        world = P["float"] + Vector((x, y, z))
        mesh.transform(Matrix.Translation(world))
        mesh.materials.append(m["titanium"])
        frag = C.mesh_object(f"FRAG_0{k + 1}", mesh, floats, col)
        frag.data.transform(Matrix.Translation(-(world - P["float"])))
        frag.location = world - P["float"]
        frag["ovra_role"] = "float"


def save(path=C.BLEND_PATH):
    import os
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.preferences.filepaths.save_version = 0  # no .blend1 backups in the repo
    bpy.ops.wm.save_as_mainfile(filepath=path, compress=True)


if __name__ == "__main__":
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    build(argv[0] if argv else "cinematic")
    save()
    print("built", len(bpy.data.objects), "objects")
