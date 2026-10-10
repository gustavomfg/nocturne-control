import { describe, expect, it, beforeEach, vi } from "vitest";
import { AnimationClip, BoxGeometry, Group, Mesh, MeshStandardMaterial, NumberKeyframeTrack, VectorKeyframeTrack } from "three";
import { Character, characterUrl, clipFor, type CharacterInput } from "./character";

const load = vi.hoisted(() => vi.fn());
vi.mock("../../core/assets", () => ({ loadGltf: load }));

function fixture() {
  const root = new Group(); root.name = "ENTITY_ROOT";
  for (const name of ["CTRL_LOOK", "CTRL_GAZE", "CTRL_IRIS", "CTRL_PUPIL", "CTRL_BODY", "GYRO_A", "GYRO_B"]) {
    const node = new Group(); node.name = name; root.add(node);
  }
  const upper = new Group(); upper.name = "LID_UPPER"; upper.rotation.x = -0.17;
  const lower = new Group(); lower.name = "LID_LOWER"; lower.rotation.x = 0.17;
  const plate = new Group(); plate.name = "PLATE_BROW"; plate.position.x = 1;
  plate.userData.ovra_open_position = [0.02, 0.01, 0.01];
  plate.userData.ovra_open_rotation = [-0.38, 0, 0];
  root.add(upper, lower, plate);
  const geometry = new BoxGeometry();
  const material = new MeshStandardMaterial({ emissive: "#ffffff", emissiveIntensity: 12.55 });
  material.name = "M_SensorGlow";
  const mesh = new Mesh(geometry, material); mesh.name = "geo_eye"; root.add(mesh);
  const animations = [
    new AnimationClip("AWAKEN", 11.8, [new VectorKeyframeTrack("CTRL_BODY.position", [0,11.8], [0,0,0,0,0,0])]),
    new AnimationClip("IDLE", 8, [
      new VectorKeyframeTrack("CTRL_BODY.position", [0,4,8], [0,0,0,0,0.02,0,0,0,0]),
      new NumberKeyframeTrack("LID_UPPER.rotation[x]", [0,4,8], [-0.17,0,-0.17]),
    ]),
    new AnimationClip("TRANSFORM", 8, [new VectorKeyframeTrack("CTRL_BODY.position", [0,8], [0,0,10,0,0,10])]),
  ];
  return { scene: root, animations, geometry, material };
}
function input(extra: Partial<CharacterInput> = {}): CharacterInput {
  return { dt: 1/60, phase: "awake", storyTime: 0, mood: "observing", reduced: false,
    light: 1, warmth: 1, openness: 0.85, lookYaw: 0, lookPitch: 0, gazeX: 0, gazeY: 0, ...extra };
}
beforeEach(() => load.mockReset());

describe("Blender character polish", () => {
  it("keeps IDLE continuous through reactions and resonance instead of selecting TRANSFORM", () => {
    expect(clipFor("intro", false)).toBe("AWAKEN");
    expect(clipFor("awake", false)).toBe("IDLE");
    expect(clipFor("sequence", false)).toBe("IDLE");
    expect(clipFor("awake", true)).toBeNull();
  });
  it("uses the preserved Pages path and compact asset", () => {
    expect(characterUrl("/ovra/", true)).toBe("/ovra/3d/entity-001/entity-optimized.glb");
    expect(characterUrl("/ovra/", false)).toBe("/ovra/3d/entity-001/entity-cinematic.glb");
  });
  it("retains the idle time across the special sequence and keeps plate travel bounded", async () => {
    load.mockResolvedValue(fixture());
    const character = await Character.load("entity.glb");
    const body = character.root.getObjectByName("CTRL_BODY")!;
    const plate = character.root.getObjectByName("PLATE_BROW")!;
    let previous = 0;
    for (let i=0; i<200; i++) {
      character.update(input({ phase: i>60 && i<160 ? "sequence" : "awake", opening: 0.14 }));
      expect(Math.abs(body.position.y - previous)).toBeLessThan(0.0001);
      expect(body.position.z).toBe(0);
      expect(plate.position.distanceTo({x:1,y:0,z:0})).toBeLessThan(0.005);
      previous = body.position.y;
    }
    expect(body.position.y).toBeGreaterThan(0.008);
    character.dispose();
  });
  it("caps emissive radiance and leaves cached materials and geometry untouched", async () => {
    const source = fixture(); load.mockResolvedValue(source);
    const originalGeometryDispose = vi.spyOn(source.geometry, "dispose");
    const originalMaterialDispose = vi.spyOn(source.material, "dispose");
    const a = await Character.load("entity.glb"), b = await Character.load("entity.glb");
    const eye = a.root.getObjectByName("geo_eye") as Mesh;
    for (let i=0; i<180; i++) a.update(input({ light: 100 }));
    expect((eye.material as MeshStandardMaterial).emissiveIntensity).toBeLessThanOrEqual(1.32);
    expect(source.material.emissiveIntensity).toBe(12.55);
    expect(eye.geometry).not.toBe(source.geometry);
    expect((b.root.getObjectByName("geo_eye") as Mesh).geometry).not.toBe(eye.geometry);
    a.dispose(); a.dispose();
    expect(originalGeometryDispose).not.toHaveBeenCalled();
    expect(originalMaterialDispose).not.toHaveBeenCalled();
    expect(source.animations[1].tracks).toHaveLength(2);
    b.dispose();
  });
  it("gives the lids one owner and does not accumulate their closing offset", async () => {
    load.mockResolvedValue(fixture()); const character = await Character.load("entity.glb");
    const upper = character.root.getObjectByName("LID_UPPER")!;
    for (let i=0; i<600; i++) character.update(input());
    const closed = upper.rotation.x;
    for (let i=0; i<600; i++) character.update(input());
    expect(upper.rotation.x).toBeCloseTo(closed, 6);
    expect(closed).toBeCloseTo(-0.1445, 5);
    character.dispose();
  });
  it("preserves orbital phase across motion-preference changes", async () => {
    load.mockResolvedValue(fixture()); const character=await Character.load("entity.glb");
    const gyro=character.root.getObjectByName("GYRO_A")!;
    const iris=character.root.getObjectByName("CTRL_IRIS")!;
    for(let i=0;i<60;i++) character.update(input());
    const orbit=gyro.quaternion.clone(), focus=iris.quaternion.clone();
    character.update(input({reduced:true}));
    expect(gyro.quaternion.angleTo(orbit)).toBeLessThan(1e-8);
    expect(iris.quaternion.angleTo(focus)).toBeLessThan(1e-8);
    character.update(input());
    expect(gyro.quaternion.angleTo(orbit)).toBeLessThan(0.002);
    character.dispose();
  });

  it("keeps all spatial controls still under reduced motion", async () => {
    load.mockResolvedValue(fixture()); const character = await Character.load("entity.glb");
    const upper = character.root.getObjectByName("LID_UPPER")!;
    character.update(input({reduced:true}));
    const angle = upper.rotation.x;
    const gaze = character.root.getObjectByName("CTRL_GAZE")!.quaternion.toArray();
    for (let i=0; i<100; i++) character.update(input({ reduced:true, opening:0.14, gazeX:1, lookYaw:0.4, openness:i%2 }));
    expect(upper.rotation.x).toBe(angle);
    expect(character.root.getObjectByName("CTRL_GAZE")!.quaternion.toArray()).toEqual(gaze);
    expect(character.root.getObjectByName("PLATE_BROW")!.position.x).toBe(1);
    character.dispose();
  });
});
