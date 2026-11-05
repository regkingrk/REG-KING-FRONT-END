/**
 * Pictures of one plate in each style, for the style picker: the same 3D plate as the live preview,
 * drawn once at a slight angle (so raised, layered and domed styles show their depth) and kept as an image.
 * One hidden renderer draws them one after another, so the page stays responsive.
 */
import { THREE, acrylicEnvironment, buildPlate, disposeGroup, studioEnvironment } from "./plate3d";
import { plateFontReady, specFrom, type PlateSpec } from "./plateRender";
import type { BuildConfig } from "./builder";

const W = 480, H = 150; // drawn at 2x for a card about 240px wide
const cache = new Map<string, string>();
const waiting = new Map<string, ((url: string | null) => void)[]>();
const queue: { key: string; spec: PlateSpec }[] = [];
let busy = false;
let gl: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; soft: THREE.Texture; acrylic: THREE.Texture } | null | false = null;

function setup() {
  if (gl !== null) return gl;
  try {
    const canvas = document.createElement("canvas");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.environment = studioEnvironment(renderer);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(-180, 260, 420);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -340, right: 340, top: 260, bottom: -260 });
    key.shadow.radius = 4;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.35;
    scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));
    const camera = new THREE.PerspectiveCamera(22, W / H, 10, 5000);
    gl = { renderer, scene, camera, soft: studioEnvironment(renderer, false), acrylic: acrylicEnvironment(renderer) };
  } catch {
    gl = false;
  }
  return gl;
}

function draw(spec: PlateSpec): string | null {
  const g = setup();
  if (!g) return null;
  const plate = buildPlate(spec, g.soft, g.acrylic);
  // turned a little to the left and tipped back, so the edges of raised letters show
  plate.rotation.set(0.3, -0.32, 0);
  g.scene.add(plate);
  // framed on the plate itself (its shadow catcher reaches well past it)
  plate.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(spec.w, spec.h, 12)).applyMatrix4(plate.matrixWorld);
  const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
  const fov = (g.camera.fov * Math.PI) / 180;
  const dist = Math.max((size.y * 1.08) / (2 * Math.tan(fov / 2)), (size.x * 1.12) / (2 * Math.tan(fov / 2) * g.camera.aspect)) + size.z * 0.55;
  g.camera.position.set(mid.x, mid.y, mid.z + dist);
  g.camera.lookAt(mid);
  g.camera.updateProjectionMatrix();
  g.renderer.render(g.scene, g.camera);
  const url = g.renderer.domElement.toDataURL("image/png");
  g.scene.remove(plate);
  disposeGroup(plate);
  return url;
}

function pump() {
  if (busy) return;
  const job = queue.shift();
  if (!job) return;
  busy = true;
  // let the page paint between pictures
  setTimeout(() => {
    let url: string | null = null;
    try {
      url = draw(job.spec);
    } catch {
      url = null;
    }
    if (url) cache.set(job.key, url);
    (waiting.get(job.key) ?? []).forEach((f) => f(url));
    waiting.delete(job.key);
    busy = false;
    pump();
  }, 30);
}

/** A picture of this plate (cached). Resolves null if 3D isn't available, so the card keeps its flat preview. */
export function styleThumb(spec: PlateSpec): Promise<string | null> {
  const key = JSON.stringify(spec);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  return plateFontReady().then(
    () =>
      new Promise((resolve) => {
        const hit2 = cache.get(key);
        if (hit2) return resolve(hit2);
        if (!waiting.has(key)) {
          waiting.set(key, []);
          queue.push({ key, spec });
        }
        waiting.get(key)!.push(resolve);
        pump();
      }),
  );
}

/** Drop pictures still waiting (e.g. the reg changed), so the newest ones are drawn first. */
export function clearThumbQueue() {
  queue.splice(0).forEach((j) => {
    (waiting.get(j.key) ?? []).forEach((f) => f(null));
    waiting.delete(j.key);
  });
}

/**
 * Used only to make the saved pictures in public/styles: a script opens the site with
 * window.__RK_MAKE_THUMBS set and calls window.__rkStyleThumb for each style.
 */
if (typeof window !== "undefined" && (window as unknown as { __RK_MAKE_THUMBS?: boolean }).__RK_MAKE_THUMBS) {
  (window as unknown as { __rkStyleThumb: (style: string, text: string, bike: boolean) => Promise<string | null> }).__rkStyleThumb = (style, text, bike) => {
    const c = { vehicle: bike ? "Bike" : "Car", legal: "Show", qty: bike ? "Single" : "Set", side: "Rear", style, rearStyle: style, extras: [], size: null, rearSize: null } as unknown as BuildConfig;
    return styleThumb(specFrom(c, text, "rear"));
  };
}
