import {
  BackSide,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  Texture,
  Vector3,
  type WebGLRenderer,
} from "three";

export type Softbox = {
  color: string;
  // Linear HDR multiplier. Values above 1 keep the highlights bright after tone mapping.
  intensity: number;
  position: [number, number, number];
  size: [number, number];
};

// Lights are described as physical panels instead of ambient fills, so reflections
// on metal carry the composition. The panels are baked once into an environment map.
export function createStudioEnvironment(renderer: WebGLRenderer, softboxes: Softbox[], dome = "#040405") {
  const pmrem = new PMREMGenerator(renderer);
  const scene = new Scene();
  const disposables: { dispose(): void }[] = [];

  const domeGeometry = new SphereGeometry(30, 32, 16);
  const domeMaterial = new MeshBasicMaterial({ color: dome, side: BackSide });
  disposables.push(domeGeometry, domeMaterial);
  scene.add(new Mesh(domeGeometry, domeMaterial));

  const target = new Vector3();
  for (const box of softboxes) {
    const geometry = new PlaneGeometry(box.size[0], box.size[1]);
    const material = new MeshBasicMaterial({ color: new Color(box.color).multiplyScalar(box.intensity), side: DoubleSide });
    disposables.push(geometry, material);
    const panel = new Mesh(geometry, material);
    panel.position.set(...box.position);
    panel.lookAt(target);
    scene.add(panel);
  }

  const texture = pmrem.fromScene(scene, 0.03).texture;
  for (const item of disposables) item.dispose();
  pmrem.dispose();
  return texture;
}

export function disposeEnvironment(texture: Texture | null) {
  texture?.dispose();
}
