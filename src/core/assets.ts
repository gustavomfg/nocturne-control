import { Material, Object3D, BufferGeometry, Texture } from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

const cache = new Map<string, Promise<GLTF>>();

// Shared GLTF/GLB loader. Experiments that bring their own models call this and
// dispose the result with `disposeObject` when they unmount.
export function loadGltf(url: string): Promise<GLTF> {
  let pending = cache.get(url);
  if (!pending) {
    pending = new GLTFLoader().loadAsync(url);
    cache.set(url, pending);
    // A failed request is not cached forever: the next visit retries it.
    pending.catch(() => cache.delete(url));
  }
  return pending;
}

type Drawable = Object3D & { geometry?: BufferGeometry; material?: Material | Material[] };

// Releases GPU resources held by an object tree. Shared geometries are still
// disposed; three.js ignores repeated disposals, so this is safe to call twice.
export function disposeObject(root: Object3D) {
  root.traverse((node) => {
    const drawable = node as Drawable;
    drawable.geometry?.dispose();
    const materials = Array.isArray(drawable.material) ? drawable.material : drawable.material ? [drawable.material] : [];
    for (const material of materials) disposeMaterial(material);
  });
}

function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) {
    if (value instanceof Texture) value.dispose();
  }
  material.dispose();
}
