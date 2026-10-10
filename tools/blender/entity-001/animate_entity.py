"""Hand-directed animation clips for ENTITY 001.

Each clip is a set of actions pushed to NLA tracks that share the clip's name;
the glTF exporter (NLA_TRACKS mode) merges them into one animation per clip.
Times are in seconds. Only channels that move are keyed: Three.js restores the
rest pose of untouched nodes when a clip stops.

Run:  blender -b assets/source/entity-001/entity-001.blend --python animate_entity.py
"""
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(__file__))
import common as C  # noqa: E402

FPS = C.FPS

# Waking order: from the back of the skull to the mask, like a wave reaching the face.
PLATE_ORDER = ["PLATE_NAPE", "PLATE_REAR_FRAME_L", "PLATE_REAR_FRAME_R", "PLATE_OCCIPUT_L", "PLATE_OCCIPUT_R",
               "PLATE_CROWN_B_L", "PLATE_CROWN_B_R", "PLATE_CREST_B", "PLATE_CROWN_A_L", "PLATE_CROWN_A_R",
               "PLATE_CREST_A", "PLATE_TEMPLE_L", "PLATE_TEMPLE_R", "PLATE_JAW", "PLATE_MUZZLE", "PLATE_BROW"]
CHEST_PLATES = ["PLATE_STERNUM_L", "PLATE_STERNUM_R", "PLATE_FLANK_L", "PLATE_FLANK_R", "PLATE_YOKE_L",
                "PLATE_YOKE_R", "PLATE_BACK", "PLATE_PAULDRON_L", "PLATE_PAULDRON_R", "PLATE_LAME_L", "PLATE_LAME_R"]
NECK = ["CTRL_NECK_01", "CTRL_NECK_02", "CTRL_NECK_03", "CTRL_HEAD"]
# Share of a head gesture taken by each segment: the base moves least, the skull most.
NECK_SHARE = [0.18, 0.24, 0.26, 0.32]
HALO_SHARDS = [f"HALO_SHARD_0{k}" for k in range(1, 8)]
FRAGS = [f"FRAG_0{k}" for k in range(1, 5)]


def obj(name):
    return bpy.data.objects[name]


class Clip:
    def __init__(self, name, seconds, loop=False):
        self.name = name
        self.seconds = seconds
        self.loop = loop
        self.actions = {}
        self.rest = {}

    def _action(self, o):
        if o.name not in self.actions:
            o.animation_data_create()
            action = bpy.data.actions.new(f"{self.name}__{o.name}")
            action.use_fake_user = True
            o.animation_data.action = action
            self.actions[o.name] = action
            self.rest[o.name] = (o.location.copy(), o.rotation_euler.copy(), o.scale.copy())
        else:
            o.animation_data.action = self.actions[o.name]
        return self.actions[o.name]

    def key(self, name, path, index, t, value, interpolation="BEZIER"):
        o = obj(name)
        self._action(o)
        loc, rot, scale = self.rest[o.name]
        base = {"location": loc, "rotation_euler": rot, "scale": scale}[path][index]
        target = getattr(o, path)
        target[index] = base + value if path != "scale" else base * value
        o.keyframe_insert(path, index=index, frame=round(t * FPS), group=self.name)
        target[index] = base
        fcurve = self._fcurve(o, path, index)
        for point in fcurve.keyframe_points:
            if abs(point.co.x - round(t * FPS)) < 0.5:
                point.interpolation = interpolation

    def _fcurve(self, o, path, index):
        action = o.animation_data.action
        for fc in _fcurves(action, o):
            if fc.data_path == path and fc.array_index == index:
                return fc
        raise KeyError(path)

    # Convenience: offsets from the rest pose.
    def loc(self, name, t, offset, interpolation="BEZIER"):
        for i, v in enumerate(offset):
            if v is not None:
                self.key(name, "location", i, t, v, interpolation)

    def rot(self, name, t, offset, interpolation="BEZIER"):
        for i, v in enumerate(offset):
            if v is not None:
                self.key(name, "rotation_euler", i, t, v, interpolation)

    def scl(self, name, t, factor, interpolation="BEZIER"):
        for i, v in enumerate(factor):
            if v is not None:
                self.key(name, "scale", i, t, v, interpolation)

    def head(self, t, pitch=0.0, yaw=0.0, roll=0.0, lag=0.07):
        """Distribute a head gesture along the neck with overlapping timing."""
        for i, name in enumerate(NECK):
            share = NECK_SHARE[i]
            # Lag never pushes a key past the end of the clip.
            self.rot(name, min(t + i * lag, self.seconds), (pitch * share, roll * share, yaw * share))

    def plate(self, name, t, amount, interpolation="BEZIER"):
        """Move a plate along its authored open pose. 1 = open, 0 = rest, <0 = clenched."""
        pose = obj(name)["ovra_open"]
        tx, ty, tz, rx, rz = (float(v) for v in pose)
        self.loc(name, t, (tx * amount, ty * amount, tz * amount), interpolation)
        self.rot(name, t, (rx * amount, None, rz * amount), interpolation)

    def finish(self):
        for name, action in self.actions.items():
            o = obj(name)
            for fc in _fcurves(action, o):
                for point in fc.keyframe_points:
                    if point.interpolation == "BEZIER":
                        point.handle_left_type = "AUTO_CLAMPED"
                        point.handle_right_type = "AUTO_CLAMPED"
                fc.update()
            track = o.animation_data.nla_tracks.new()
            track.name = self.name
            strip = track.strips.new(self.name, 0, action)
            strip.name = self.name
            track.mute = True
            o.animation_data.action = None
            loc, rot, scale = self.rest[name]
            o.location, o.rotation_euler, o.scale = loc, rot, scale


def _fcurves(action, o):
    """F-curves of an action for one object, for both legacy and slotted actions."""
    if hasattr(action, "layers") and action.layers:
        slot = o.animation_data.action_slot
        for layer in action.layers:
            for strip in layer.strips:
                bag = strip.channelbag(slot) if slot else None
                if bag:
                    yield from bag.fcurves
        return
    yield from action.fcurves


def wave(clip, name, path, index, t0, t1, amplitude, period, phase=0.0, step=0.5):
    """Sample a sine as Bezier keys: smooth secondary motion that loops on its period."""
    t = t0
    while t <= t1 + 1e-6:
        value = amplitude * math.sin(2 * math.pi * (t - t0) / period + phase)
        clip.key(name, path, index, t, value)
        t += step


# --------------------------------------------------------------------------- AWAKEN

def awaken():
    c = Clip("AWAKEN", 11.8)
    # Collapsed: chin to chest, lids shut, plates clenched, halo sunk behind the back.
    c.head(0, pitch=0.78, roll=0.05, lag=0)
    c.head(1.4, pitch=0.78, roll=0.05, lag=0)
    c.loc("CTRL_BODY", 0, (0, 0.01, -0.045))
    c.rot("CTRL_TORSO", 0, (0.14, 0, 0))
    for side in ("L", "R"):
        c.rot(f"CTRL_SHOULDER_{side}", 0, (0.16, 0, 0))
        c.loc(f"CTRL_SHOULDER_{side}", 0, (0, -0.012, 0.018))
    c.rot("LID_UPPER", 0, (0.17, 0, 0))
    c.rot("LID_LOWER", 0, (-0.17, 0, 0))
    c.scl("CTRL_PUPIL", 0, (0.12, 1, 0.12))
    c.rot("CTRL_IRIS", 0, (0, -0.6, 0))
    for name in PLATE_ORDER:
        c.plate(name, 0, -0.18)
    c.loc("CTRL_HALO", 0, (0, 0.08, -0.34))
    c.rot("CTRL_HALO", 0, (-0.5, 0.3, 0))
    c.scl("CTRL_HALO", 0, (0.82, 0.82, 0.82))
    for k, name in enumerate(HALO_SHARDS):
        c.rot(name, 0, (0.4 * ((-1) ** k), 0.2 * k, 0))
    c.loc("CTRL_FLOAT", 0, (0, 0.02, -0.16))

    # 0.9 s: the first sign of life, one fragment shivers.
    c.rot("FRAG_02", 0.0, (0, 0, 0))
    c.rot("FRAG_02", 0.9, (0, 0, 0))
    c.rot("FRAG_02", 1.0, (0.12, 0, 0.05))
    c.rot("FRAG_02", 1.25, (-0.05, 0, 0))
    c.rot("FRAG_02", 1.6, (0, 0, 0))

    # 1.4 s: the heart's gyroscopes start, slow then steady.
    c.rot("GYRO_A", 1.4, (0, 0, 0))
    c.rot("GYRO_A", 4.4, (0, 0, math.pi * 1.2))
    c.rot("GYRO_A", 11.8, (0, 0, math.pi * 6.0), "LINEAR")
    c.rot("GYRO_B", 2.0, (0, 0, 0))
    c.rot("GYRO_B", 5.0, (math.pi * 0.9, 0, 0))
    c.rot("GYRO_B", 11.8, (math.pi * 4.6, 0, 0), "LINEAR")
    c.loc("CTRL_BODY", 1.4, (0, 0.01, -0.045))
    c.loc("CTRL_BODY", 3.2, (0, 0.008, -0.036))

    # 2.6 s: plates unclench one after another, each with a small click past rest.
    for i, name in enumerate(PLATE_ORDER):
        t = 2.6 + i * 0.13
        c.plate(name, t, -0.18)
        c.plate(name, t + 0.12, 0.07)
        c.plate(name, t + 0.32, 0.0)

    # 4.2 s: the halo rises and its shards find their places, staggered.
    c.loc("CTRL_HALO", 4.2, (0, 0.08, -0.34))
    c.rot("CTRL_HALO", 4.2, (-0.5, 0.3, 0))
    c.scl("CTRL_HALO", 4.2, (0.82, 0.82, 0.82))
    c.loc("CTRL_HALO", 6.2, (0, 0, 0.012))
    c.loc("CTRL_HALO", 6.8, (0, 0, 0))
    c.rot("CTRL_HALO", 6.4, (0, 0, 0))
    c.scl("CTRL_HALO", 6.0, (1.0, 1.0, 1.0))
    for k, name in enumerate(HALO_SHARDS):
        c.rot(name, 4.4 + k * 0.1, (0.4 * ((-1) ** k), 0.2 * k, 0))
        c.rot(name, 5.6 + k * 0.12, (-0.04 * ((-1) ** k), 0, 0))
        c.rot(name, 6.1 + k * 0.12, (0, 0, 0))
    c.loc("CTRL_FLOAT", 4.0, (0, 0.02, -0.16))
    c.loc("CTRL_FLOAT", 6.4, (0, 0, 0.008))
    c.loc("CTRL_FLOAT", 7.0, (0, 0, 0))

    # 5.6 s: the head sinks a little further (anticipation), then the neck lifts it,
    # base first; the skull overshoots upward and settles.
    c.head(5.6, pitch=0.86, roll=0.05, lag=0.0)
    c.head(6.0, pitch=0.86, roll=0.05, lag=0.12)
    c.head(8.3, pitch=-0.08, roll=-0.02, lag=0.12)
    c.head(9.2, pitch=0.02, roll=0.0, lag=0.1)
    c.loc("CTRL_BODY", 6.0, (0, 0.008, -0.036))
    c.loc("CTRL_BODY", 8.4, (0, 0, 0.004))
    c.loc("CTRL_BODY", 9.2, (0, 0, 0))
    c.rot("CTRL_TORSO", 5.8, (0.14, 0, 0))
    c.rot("CTRL_TORSO", 8.6, (-0.015, 0, 0))
    c.rot("CTRL_TORSO", 9.4, (0, 0, 0))
    for side in ("L", "R"):
        c.rot(f"CTRL_SHOULDER_{side}", 6.2, (0.16, 0, 0))
        c.rot(f"CTRL_SHOULDER_{side}", 8.8, (0, 0, 0))
        c.loc(f"CTRL_SHOULDER_{side}", 6.2, (0, -0.012, 0.018))
        c.loc(f"CTRL_SHOULDER_{side}", 8.8, (0, 0, 0))

    # 7.6 s: the lids part halfway and the sensor warms; 8.9 s they open at once.
    c.rot("LID_UPPER", 7.6, (0.17, 0, 0))
    c.rot("LID_LOWER", 7.6, (-0.17, 0, 0))
    c.rot("LID_UPPER", 8.5, (0.09, 0, 0))
    c.rot("LID_LOWER", 8.5, (-0.09, 0, 0))
    c.rot("LID_UPPER", 8.9, (0.09, 0, 0))
    c.rot("LID_LOWER", 8.9, (-0.09, 0, 0))
    c.rot("LID_UPPER", 9.15, (-0.01, 0, 0))
    c.rot("LID_LOWER", 9.15, (0.01, 0, 0))
    c.rot("LID_UPPER", 9.4, (0, 0, 0))
    c.rot("LID_LOWER", 9.4, (0, 0, 0))
    c.scl("CTRL_PUPIL", 7.6, (0.12, 1, 0.12))
    c.scl("CTRL_PUPIL", 8.6, (0.55, 1, 0.55))
    c.scl("CTRL_PUPIL", 9.2, (1.08, 1, 1.08))
    c.scl("CTRL_PUPIL", 9.6, (1.0, 1, 1.0))
    c.rot("CTRL_IRIS", 7.6, (0, -0.6, 0))
    c.rot("CTRL_IRIS", 9.3, (0, 0.05, 0))

    # 9.8 s: it notices something in front. The eye goes first, the head follows,
    # a curious tilt, a focus pulse, then stillness facing the visitor.
    c.rot("CTRL_EYE", 9.6, (0, 0, 0))
    c.rot("CTRL_EYE", 9.75, (0.02, 0, 0.09))
    c.rot("CTRL_EYE", 10.6, (0.02, 0, 0.09))
    c.rot("CTRL_EYE", 10.8, (0, 0, 0))
    c.head(9.8, pitch=0.02, lag=0.08)
    c.head(10.4, pitch=0.05, yaw=0.08, roll=0.07, lag=0.08)
    c.head(11.2, pitch=0.0, yaw=0.0, roll=0.0, lag=0.08)
    c.scl("CTRL_PUPIL", 10.3, (1.0, 1, 1.0))
    c.scl("CTRL_PUPIL", 10.45, (0.78, 1, 0.78))
    c.scl("CTRL_PUPIL", 11.0, (0.92, 1, 0.92))
    c.scl("CTRL_PUPIL", 11.8, (1.0, 1, 1.0))
    c.rot("CTRL_IRIS", 10.3, (0, 0.05, 0))
    c.rot("CTRL_IRIS", 10.45, (0, 0.32, 0))
    c.rot("CTRL_IRIS", 11.8, (0, 0.0, 0))
    c.loc("CTRL_BODY", 10.2, (0, 0, 0))
    c.loc("CTRL_BODY", 10.8, (0, -0.012, 0.002))
    c.loc("CTRL_BODY", 11.8, (0, 0, 0))
    c.finish()


# --------------------------------------------------------------------------- IDLE

def idle():
    c = Clip("IDLE", 8.0, loop=True)
    # Artificial breath: inhale, a held beat, exhale, a pause. Two per loop.
    for start in (0.0, 4.0):
        c.loc("CTRL_BODY", start, (0, 0, 0))
        c.loc("CTRL_BODY", start + 1.4, (0, 0, 0.005))
        c.loc("CTRL_BODY", start + 2.0, (0, 0, 0.005))
        c.loc("CTRL_BODY", start + 3.6, (0, 0, 0))
        c.rot("CTRL_TORSO", start, (0, 0, 0))
        c.rot("CTRL_TORSO", start + 1.4, (-0.012, 0, 0))
        c.rot("CTRL_TORSO", start + 2.0, (-0.012, 0, 0))
        c.rot("CTRL_TORSO", start + 3.6, (0, 0, 0))
        c.rot("PLATE_JAW", start, (0, 0, 0))
        c.rot("PLATE_JAW", start + 1.5, (0.018, 0, 0))
        c.rot("PLATE_JAW", start + 2.1, (0.018, 0, 0))
        c.rot("PLATE_JAW", start + 3.4, (0, 0, 0))
        for side in ("L", "R"):
            c.loc(f"CTRL_SHOULDER_{side}", start, (0, 0, 0))
            c.loc(f"CTRL_SHOULDER_{side}", start + 1.5, (0, 0, 0.004))
            c.loc(f"CTRL_SHOULDER_{side}", start + 3.6, (0, 0, 0))
    c.loc("CTRL_BODY", 8.0, (0, 0, 0))
    c.rot("CTRL_TORSO", 8.0, (0, 0, 0))
    c.rot("PLATE_JAW", 8.0, (0, 0, 0))

    # Glances: the eye moves first (a saccade), the head follows later and less.
    for t, yaw in ((0.0, 0), (1.3, 0), (1.42, 0.13), (3.0, 0.13), (3.15, 0), (4.7, 0), (4.82, -0.15), (6.6, -0.15), (6.75, 0), (8.0, 0)):
        c.rot("CTRL_EYE", t, (0, 0, yaw))
    c.head(0.0, lag=0)
    c.head(1.55, lag=0.06)
    c.head(2.3, yaw=0.05, pitch=-0.015, lag=0.06)
    c.head(3.1, yaw=0.05, pitch=-0.015, lag=0.06)
    c.head(3.8, lag=0.06)
    c.head(4.95, lag=0.06)
    c.head(5.8, yaw=-0.045, roll=-0.03, lag=0.06)
    c.head(6.7, yaw=-0.045, roll=-0.03, lag=0.06)
    c.head(7.6, lag=0.06)
    c.head(8.0 - 0.18, lag=0.06)

    # A blink at 3.6 s: quick close, a held frame, slower open.
    for name, sign in (("LID_UPPER", 1), ("LID_LOWER", -1)):
        c.rot(name, 0.0, (0, 0, 0))
        c.rot(name, 3.5, (0, 0, 0))
        c.rot(name, 3.62, (0.17 * sign, 0, 0))
        c.rot(name, 3.7, (0.17 * sign, 0, 0))
        c.rot(name, 3.92, (0, 0, 0))
        c.rot(name, 8.0, (0, 0, 0))
    # Focus adjustment.
    for t, s in ((0, 1), (4.5, 1), (4.62, 0.86), (5.3, 0.93), (8.0, 1)):
        c.scl("CTRL_PUPIL", t, (s, 1, s))
    for t, r in ((0, 0), (4.5, 0), (4.62, 0.22), (8.0, 0)):
        c.rot("CTRL_IRIS", t, (0, r, 0))

    # Mechanisms run continuously and loop exactly.
    c.rot("GYRO_A", 0, (0, 0, 0), "LINEAR")
    c.rot("GYRO_A", 8, (0, 0, math.tau), "LINEAR")
    c.rot("GYRO_B", 0, (0, 0, 0), "LINEAR")
    c.rot("GYRO_B", 8, (-math.tau, 0, 0), "LINEAR")
    # Floating parts drift on periods that divide the loop.
    wave(c, "CTRL_HALO", "rotation_euler", 2, 0, 8, 0.035, 8)
    wave(c, "CTRL_HALO", "location", 2, 0, 8, 0.006, 4, 0.7)
    for k, name in enumerate(HALO_SHARDS):
        wave(c, name, "location", 2, 0, 8, 0.004 + 0.002 * (k % 3), 8 / (1 + k % 2), k * 0.9)
        wave(c, name, "rotation_euler", 0, 0, 8, 0.03, 8, k * 1.3, step=1.0)
    for k, name in enumerate(FRAGS):
        wave(c, name, "location", 2, 0, 8, 0.008, 4 if k % 2 else 8, k * 1.1)
        wave(c, name, "rotation_euler", 2, 0, 8, 0.25, 8, k * 0.8, step=1.0)
    c.finish()


# --------------------------------------------------------------------------- OBSERVE

def observe():
    c = Clip("OBSERVE", 4.5)
    # The eye finds the target first.
    c.rot("CTRL_EYE", 0.0, (0, 0, 0))
    c.rot("CTRL_EYE", 0.14, (0.03, 0, 0.07))
    c.rot("CTRL_EYE", 0.9, (0.03, 0, 0.05))
    c.rot("CTRL_EYE", 1.6, (0.02, 0, 0.04))
    c.rot("CTRL_EYE", 3.2, (0.02, 0, 0.04))
    c.rot("CTRL_EYE", 4.5, (0, 0, 0))
    # Anticipation: a slight pull back before leaning in.
    c.head(0.0, lag=0)
    c.head(0.3, lag=0.05)
    # The curiosity faces the visitor: a tilt and a lean, not a turn away.
    # Runtime code adds the lateral aim through CTRL_LOOK.
    c.head(0.62, pitch=-0.05, yaw=0.01, lag=0.05)
    c.head(1.45, pitch=0.07, yaw=0.07, roll=0.24, lag=0.07)
    c.head(1.85, pitch=0.06, yaw=0.06, roll=0.2, lag=0.07)
    c.head(2.5, pitch=0.07, yaw=0.065, roll=0.21, lag=0.07)
    c.head(2.62, pitch=0.08, yaw=0.07, roll=0.23, lag=0.03)
    c.head(3.15, pitch=0.07, yaw=0.06, roll=0.2, lag=0.07)
    c.head(4.5, lag=0.08)
    c.loc("CTRL_BODY", 0.0, (0, 0, 0))
    c.loc("CTRL_BODY", 0.62, (0, 0.008, 0))
    c.loc("CTRL_BODY", 1.5, (0, -0.03, 0.003))
    c.loc("CTRL_BODY", 3.15, (0, -0.028, 0.003))
    c.loc("CTRL_BODY", 4.5, (0, 0, 0))
    c.rot("CTRL_TORSO", 0.0, (0, 0, 0))
    c.rot("CTRL_TORSO", 1.5, (0.045, 0, 0.04))
    c.rot("CTRL_TORSO", 3.2, (0.04, 0, 0.035))
    c.rot("CTRL_TORSO", 4.5, (0, 0, 0))
    # Focus: the lids narrow, the pupil tightens, the iris turns. A second pulse at 2.5 s.
    for name, sign in (("LID_UPPER", 1), ("LID_LOWER", -1)):
        c.rot(name, 0.0, (0, 0, 0))
        c.rot(name, 0.6, (0, 0, 0))
        c.rot(name, 1.3, (0.06 * sign, 0, 0))
        c.rot(name, 3.3, (0.06 * sign, 0, 0))
        c.rot(name, 4.2, (0, 0, 0))
    for t, s in ((0, 1), (0.16, 0.74), (1.4, 0.82), (2.5, 0.82), (2.6, 0.66), (2.9, 0.8), (4.5, 1)):
        c.scl("CTRL_PUPIL", t, (s, 1, s))
    for t, r in ((0, 0), (0.16, 0.3), (2.5, 0.3), (2.6, 0.55), (4.5, 0)):
        c.rot("CTRL_IRIS", t, (0, r, 0))
    # The halo lags behind the head: overlapping action.
    c.rot("CTRL_HALO", 0.0, (0, 0, 0))
    c.rot("CTRL_HALO", 1.9, (0, 0.06, 0.08))
    c.rot("CTRL_HALO", 3.4, (0, 0.05, 0.07))
    c.rot("CTRL_HALO", 4.5, (0, 0, 0))
    c.finish()


# --------------------------------------------------------------------------- RECOIL

def recoil():
    c = Clip("RECOIL", 3.2)
    c.head(0.0, lag=0)
    c.head(0.1, pitch=0.03, lag=0)          # leans toward the stimulus...
    c.head(0.32, pitch=-0.2, yaw=-0.14, roll=-0.06, lag=0.035)  # ...and snaps away
    c.head(0.5, pitch=-0.15, yaw=-0.12, roll=-0.05, lag=0.035)
    c.loc("CTRL_BODY", 0.0, (0, 0, 0))
    c.loc("CTRL_BODY", 0.1, (0, -0.004, 0))
    c.loc("CTRL_BODY", 0.3, (0, 0.07, -0.012))
    c.loc("CTRL_BODY", 0.48, (0, 0.06, -0.01))
    c.rot("CTRL_TORSO", 0.0, (0, 0, 0))
    c.rot("CTRL_TORSO", 0.3, (-0.11, 0, -0.05))
    c.rot("CTRL_TORSO", 0.5, (-0.09, 0, -0.04))
    # It shields itself: shoulders rise and fold forward, plates clench, lids narrow.
    for side, sign in (("L", 1), ("R", -1)):
        c.rot(f"CTRL_SHOULDER_{side}", 0.0, (0, 0, 0))
        c.rot(f"CTRL_SHOULDER_{side}", 0.3, (-0.25, 0, -0.18 * sign))
        c.loc(f"CTRL_SHOULDER_{side}", 0.0, (0, 0, 0))
        c.loc(f"CTRL_SHOULDER_{side}", 0.3, (-0.02 * sign, -0.03, 0.035))
        c.rot(f"CTRL_SHOULDER_{side}", 1.6, (-0.22, 0, -0.16 * sign))
        c.loc(f"CTRL_SHOULDER_{side}", 1.6, (-0.018 * sign, -0.027, 0.03))
        c.rot(f"CTRL_SHOULDER_{side}", 3.2, (0, 0, 0))
        c.loc(f"CTRL_SHOULDER_{side}", 3.2, (0, 0, 0))
    for i, name in enumerate(PLATE_ORDER):
        c.plate(name, 0.0, 0)
        c.plate(name, 0.24 + (i % 4) * 0.015, -0.32)
        c.plate(name, 1.8, -0.26)
        c.plate(name, 3.0, 0)
    for name, sign in (("LID_UPPER", 1), ("LID_LOWER", -1)):
        c.rot(name, 0.0, (0, 0, 0))
        c.rot(name, 0.2, (0.13 * sign, 0, 0))
        c.rot(name, 1.6, (0.11 * sign, 0, 0))
        c.rot(name, 2.8, (0, 0, 0))
    for t, s in ((0, 1), (0.18, 0.4), (1.6, 0.5), (3.0, 1)):
        c.scl("CTRL_PUPIL", t, (s, 1, s))
    # A tremor that dies away: damped oscillation on the head.
    for k in range(10):
        t = 0.55 + k * 0.09
        amp = 0.016 * (1 - k / 10)
        c.head(t, pitch=-0.15 + amp * (-1) ** k, yaw=-0.12 + amp * 0.6 * (-1) ** (k + 1), roll=-0.05, lag=0.0)
    c.head(1.7, pitch=-0.13, yaw=-0.1, roll=-0.04, lag=0.05)
    c.head(3.2, lag=0.08)
    c.loc("CTRL_BODY", 1.7, (0, 0.05, -0.008))
    c.loc("CTRL_BODY", 3.2, (0, 0, 0))
    c.rot("CTRL_TORSO", 1.7, (-0.08, 0, -0.03))
    c.rot("CTRL_TORSO", 3.2, (0, 0, 0))
    # The halo and fragments pull in close.
    c.scl("CTRL_HALO", 0.0, (1, 1, 1))
    c.scl("CTRL_HALO", 0.34, (0.92, 0.92, 0.92))
    c.scl("CTRL_HALO", 3.2, (1, 1, 1))
    c.scl("CTRL_FLOAT", 0.0, (1, 1, 1))
    c.scl("CTRL_FLOAT", 0.36, (0.8, 0.8, 0.8))
    c.scl("CTRL_FLOAT", 3.2, (1, 1, 1))
    c.finish()


# --------------------------------------------------------------------------- TRANSFORM

def transform():
    """Aligned with the web resonance: anticipation 0, rupture 1.2, threshold 3.8,
    inside 7.0, return 8.4, end 12.6 s."""
    c = Clip("TRANSFORM", 12.6)
    all_plates = PLATE_ORDER + CHEST_PLATES
    # Anticipation: the whole body braces and clenches.
    for name in all_plates:
        c.plate(name, 0.0, 0)
        c.plate(name, 1.1, -0.22)
    c.head(0.0, lag=0)
    c.head(1.1, pitch=0.07, lag=0.05)
    c.loc("CTRL_BODY", 0.0, (0, 0, 0))
    c.loc("CTRL_BODY", 1.1, (0, 0, -0.016))
    for name, sign in (("LID_UPPER", 1), ("LID_LOWER", -1)):
        c.rot(name, 0.0, (0, 0, 0))
        c.rot(name, 1.1, (0.12 * sign, 0, 0))
        c.rot(name, 1.6, (-0.04 * sign, 0, 0))
        c.rot(name, 8.4, (-0.04 * sign, 0, 0))
        c.rot(name, 10.6, (0, 0, 0))
    c.scl("CTRL_HALO", 0.0, (1, 1, 1))
    c.scl("CTRL_HALO", 1.1, (0.9, 0.9, 0.9))
    for t, s in ((0, 1), (1.1, 0.45), (1.5, 1.45), (8.4, 1.35), (10.4, 1.0)):
        c.scl("CTRL_PUPIL", t, (s, 1, s))

    # Rupture: plates open from the crest outward, each overshooting before it holds.
    order = ["PLATE_CREST_A", "PLATE_CREST_B", "PLATE_BROW", "PLATE_CROWN_A_L", "PLATE_CROWN_A_R",
             "PLATE_CROWN_B_L", "PLATE_CROWN_B_R", "PLATE_TEMPLE_L", "PLATE_TEMPLE_R", "PLATE_OCCIPUT_L",
             "PLATE_OCCIPUT_R", "PLATE_MUZZLE", "PLATE_JAW", "PLATE_REAR_FRAME_L", "PLATE_REAR_FRAME_R",
             "PLATE_NAPE", "PLATE_STERNUM_L", "PLATE_STERNUM_R", "PLATE_YOKE_L", "PLATE_YOKE_R",
             "PLATE_FLANK_L", "PLATE_FLANK_R", "PLATE_PAULDRON_L", "PLATE_PAULDRON_R",
             "PLATE_LAME_L", "PLATE_LAME_R", "PLATE_BACK"]
    for i, name in enumerate(order):
        t = 1.2 + i * 0.09
        c.plate(name, t, -0.22)
        c.plate(name, t + 0.9, 1.12)
        c.plate(name, t + 1.5, 1.0)
        # Threshold and inside: the open matter floats, then holds still.
        c.plate(name, 5.6 + (i % 5) * 0.2, 1.06)
        c.plate(name, 7.0, 1.0)
        c.plate(name, 8.4, 1.0)
    c.head(1.6, pitch=-0.12, lag=0.06)
    c.head(4.8, pitch=-0.09, roll=0.03, lag=0.08)
    c.head(8.4, pitch=-0.08, lag=0.08)
    c.loc("CTRL_BODY", 2.2, (0, 0, 0.012))
    c.loc("CTRL_BODY", 8.4, (0, 0, 0.01))
    c.scl("CTRL_HALO", 2.6, (1.4, 1.4, 1.4))
    c.scl("CTRL_HALO", 8.4, (1.42, 1.42, 1.42))
    c.rot("CTRL_HALO", 0.0, (0, 0, 0))
    c.rot("CTRL_HALO", 8.4, (0, 0, math.pi * 0.9))
    c.scl("CTRL_FLOAT", 0.0, (1, 1, 1))
    c.scl("CTRL_FLOAT", 2.4, (1.9, 1.9, 1.9))
    c.scl("CTRL_FLOAT", 8.4, (1.95, 1.95, 1.95))
    # The heart accelerates while it is exposed.
    c.rot("GYRO_A", 0.0, (0, 0, 0))
    c.rot("GYRO_A", 1.2, (0, 0, 0.6))
    c.rot("GYRO_A", 8.4, (0, 0, math.pi * 9), "LINEAR")
    c.rot("GYRO_A", 12.6, (0, 0, math.pi * 10))
    c.rot("GYRO_B", 0.0, (0, 0, 0))
    c.rot("GYRO_B", 1.2, (0.5, 0, 0))
    c.rot("GYRO_B", 8.4, (-math.pi * 7, 0, 0), "LINEAR")
    c.rot("GYRO_B", 12.6, (-math.pi * 8, 0, 0))

    # Return: plates close in reverse order with a firm clack past rest.
    for i, name in enumerate(reversed(order)):
        t = 8.6 + i * 0.07
        c.plate(name, t + 1.2, -0.08)
        c.plate(name, t + 1.5, 0.0)
    c.head(10.8, pitch=0.03, lag=0.08)
    c.head(12.6, lag=0.08)
    c.loc("CTRL_BODY", 10.6, (0, 0, -0.006))
    c.loc("CTRL_BODY", 12.6, (0, 0, 0))
    c.scl("CTRL_HALO", 10.8, (0.97, 0.97, 0.97))
    c.scl("CTRL_HALO", 12.0, (1, 1, 1))
    c.rot("CTRL_HALO", 11.6, (0, 0, math.tau))
    c.scl("CTRL_FLOAT", 10.6, (1, 1, 1))
    c.finish()


def animate():
    for o in bpy.data.objects:
        if o.animation_data:
            o.animation_data_clear()
    awaken()
    idle()
    observe()
    recoil()
    transform()
    scene = bpy.context.scene
    scene.frame_start = 0
    scene.frame_end = round(12.6 * FPS)


if __name__ == "__main__":
    animate()
    bpy.ops.wm.save_as_mainfile(filepath=C.BLEND_PATH, compress=True)
    print("animated", len(bpy.data.actions), "actions")
