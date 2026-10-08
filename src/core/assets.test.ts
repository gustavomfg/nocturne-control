import { BoxGeometry, Mesh, MeshStandardMaterial, Texture, Group } from "three";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { disposeObject, loadGltf } from "./assets";

const { loadAsync } = vi.hoisted(() => ({ loadAsync: vi.fn() }));
vi.mock("three/addons/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    loadAsync = loadAsync;
  },
}));

beforeEach(() => {
  loadAsync.mockReset();
});

describe("disposeObject", () => {
  it("releases geometry, materials and their textures", () => {
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshStandardMaterial({ map: texture });
    const root = new Group();
    root.add(new Mesh(geometry, material));

    const disposed: string[] = [];
    vi.spyOn(geometry, "dispose").mockImplementation(() => disposed.push("geometry"));
    vi.spyOn(material, "dispose").mockImplementation(() => disposed.push("material"));
    vi.spyOn(texture, "dispose").mockImplementation(() => disposed.push("texture"));

    disposeObject(root);
    expect(disposed).toEqual(expect.arrayContaining(["geometry", "material", "texture"]));
  });
});

describe("loadGltf", () => {
  it("loads each URL once and retries after a failure", async () => {
    const scene = { scene: new Group() };
    loadAsync.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(scene);

    await expect(loadGltf("/models/a.glb")).rejects.toThrow("offline");
    await expect(loadGltf("/models/a.glb")).resolves.toBe(scene);
    await expect(loadGltf("/models/a.glb")).resolves.toBe(scene);
    expect(loadAsync).toHaveBeenCalledTimes(2);
  });
});
