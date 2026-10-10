"""Checks an exported ENTITY 001 GLB against the integration contract and budget.

Run with plain Python 3:  python3 validate_glb.py public/3d/entity-001/entity-cinematic.glb
"""
import json
import struct
import sys

REQUIRED_NODES = ["ENTITY_ROOT", "CTRL_BODY", "CTRL_TORSO", "CTRL_CORE", "CTRL_NECK_01", "CTRL_NECK_02",
                  "CTRL_NECK_03", "CTRL_LOOK", "CTRL_HEAD", "CTRL_GAZE", "CTRL_SKULL", "CTRL_EYE", "CTRL_IRIS", "CTRL_PUPIL",
                  "CTRL_HALO", "CTRL_FLOAT", "CTRL_SHOULDER_L", "CTRL_SHOULDER_R", "LID_UPPER", "LID_LOWER",
                  "PLATE_JAW", "PLATE_BROW", "GYRO_A", "GYRO_B"]
REQUIRED_ANIMATIONS = ["AWAKEN", "IDLE", "OBSERVE", "RECOIL", "TRANSFORM"]
REQUIRED_MATERIALS = ["M_Titanium", "M_Ceramic", "M_Brushed", "M_Inner", "M_Lens", "M_CoreEmber", "M_SensorGlow", "M_FrostSignal"]
BUDGETS = {
    "entity-cinematic.glb": {"triangles": 260_000, "draw_calls": 90, "bytes": 7_000_000},
    "entity-optimized.glb": {"triangles": 80_000, "draw_calls": 90, "bytes": 2_500_000},
}


def read_glb(path):
    with open(path, "rb") as handle:
        data = handle.read()
    magic, version, length = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67 and version == 2 and length == len(data), "not a valid glTF 2.0 binary"
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    assert chunk_type == 0x4E4F534A
    gltf = json.loads(data[20:20 + chunk_length])
    return gltf, len(data)


def report(path):
    gltf, size = read_glb(path)
    accessors = gltf["accessors"]
    triangles = 0
    draw_calls = 0
    for mesh in gltf.get("meshes", []):
        for primitive in mesh["primitives"]:
            draw_calls += 1
            triangles += accessors[primitive["indices"]]["count"] // 3
    names = {node.get("name") for node in gltf["nodes"]}
    animations = {}
    views = gltf["bufferViews"]
    anim_bytes = 0
    for animation in gltf.get("animations", []):
        duration = 0.0
        for sampler in animation["samplers"]:
            duration = max(duration, accessors[sampler["input"]]["max"][0])
            for key in ("input", "output"):
                anim_bytes += views[accessors[sampler[key]]["bufferView"]]["byteLength"]
        animations[animation["name"]] = (round(duration, 2), len(animation["channels"]))
    image_bytes = sum(views[image["bufferView"]]["byteLength"] for image in gltf.get("images", []))
    materials = [m["name"] for m in gltf.get("materials", [])]
    extras = sum(1 for node in gltf["nodes"] if "extras" in node)

    problems = []
    problems += [f"missing node {n}" for n in REQUIRED_NODES if n not in names]
    problems += [f"missing animation {a}" for a in REQUIRED_ANIMATIONS if a not in animations]
    problems += [f"missing material {m}" for m in REQUIRED_MATERIALS if m not in materials]
    # Runtime nodes must stay free of authored animation.
    animated = {gltf["nodes"][ch["target"]["node"]].get("name") for a in gltf.get("animations", []) for ch in a["channels"]}
    problems += [f"runtime node {n} is animated" for n in ("CTRL_LOOK", "CTRL_GAZE", "ENTITY_ROOT") if n in animated]
    budget = BUDGETS.get(path.split("/")[-1])
    if budget:
        if triangles > budget["triangles"]:
            problems.append(f"triangles {triangles} > {budget['triangles']}")
        if draw_calls > budget["draw_calls"]:
            problems.append(f"draw calls {draw_calls} > {budget['draw_calls']}")
        if size > budget["bytes"]:
            problems.append(f"size {size} > {budget['bytes']}")

    print(f"{path}")
    print(f"  size {size / 1e6:.2f} MB  (animation {anim_bytes / 1e6:.2f} MB, images {image_bytes / 1e6:.2f} MB)")
    print(f"  nodes {len(gltf['nodes'])}  meshes {len(gltf.get('meshes', []))}  draw calls {draw_calls}  triangles {triangles}")
    print(f"  materials {len(materials)}  images {len(gltf.get('images', []))}  nodes with extras {extras}")
    print(f"  extensions {gltf.get('extensionsUsed', [])}")
    for name, (duration, channels) in animations.items():
        print(f"  animation {name:<10} {duration:>5.2f} s  {channels} channels")
    print("  OK" if not problems else "  PROBLEMS: " + "; ".join(problems))
    return not problems


if __name__ == "__main__":
    ok = all([report(path) for path in sys.argv[1:]])
    sys.exit(0 if ok else 1)
