/**
 * REG KING cinematic intro engine (v3).
 *
 * Framework-agnostic: THREE and gsap are injected so the same code runs in the
 * Next.js app (ES imports) and in the standalone preview (CDN globals).
 *
 * Scenes (≈3.9s, skippable):
 *  1. Black. A gold light streak cuts across; the crown (or, without a crown
 *     file, the gold "R" of the official wordmark) dissolves in under moving
 *     light, extruded in 3D, above a reflective floor.
 *  2. The full REG KING wordmark completes with a metallic sheen, and
 *     "HELPING CROWN YOUR CAR" appears beneath it.
 *  3. The logo flies into the black header's logo slot as the black lifts
 *     away like a curtain onto the yellow hero. The 3D logo hands off to the
 *     real header <img> pixel-for-pixel and the WebGL layer is released.
 *  4. The white plate search tilts up, then S-E-A-R-C-H is pressed onto it
 *     one letter at a time, like characters being fitted to a plate.
 *  5. The letters lift away to leave the plate ready to type; the search
 *     button, suggestions and BUY / MAKE / SELL rise in.
 *
 * The logo artwork is never redrawn: it is always the brand file as a texture.
 */

import type * as ThreeNS from "three";

type Three = typeof ThreeNS;
type Tl = {
  to: (t: object | object[], v: Record<string, unknown>, p?: number | string) => Tl;
  fromTo: (t: object | object[], f: Record<string, unknown>, v: Record<string, unknown>, p?: number | string) => Tl;
  progress: (v?: number) => number | Tl;
  call: (fn: () => void, params?: unknown[], p?: number | string) => Tl;
  play: () => Tl;
  kill: () => void;
  eventCallback: (type: string, fn: () => void) => Tl;
};
type Gsap = {
  timeline: (vars?: Record<string, unknown>) => Tl;
  to: (t: object | object[], v: Record<string, unknown>) => unknown;
  set: (t: object | object[], v: Record<string, unknown>) => unknown;
  killTweensOf: (t: object | object[]) => void;
};

export interface IntroAssets {
  wordmark?: string | null;
  crown?: string | null;
  /** Fraction of the wordmark's width taken by the gold "R". */
  markCrop?: number;
}

export interface IntroElements {
  /** Fixed full-screen layer that holds the intro. */
  overlay: HTMLElement;
  /** Opaque black backdrop inside the overlay (fades to reveal the hero). */
  backdrop: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Two letterbox bars (top, bottom). */
  bars: HTMLElement[];
  /** Horizontal light streak that becomes the floor line. */
  flare: HTMLElement;
  introSlogan: HTMLElement;
  introSloganChars: HTMLElement[];
  /** The header's logo element: final landing position + hand-off target. */
  slot: HTMLElement;
  /** Hero copy that rises in (eyebrow, headline, lede). */
  heroItems: HTMLElement[];
  /** The white plate; tilts up into place. */
  plate: HTMLElement;
  /** Layer over the plate holding the stamped letters. */
  stamp: HTMLElement;
  stampLetters: HTMLElement[];
  /** Everything that rises in after the stamp (button, suggestions, BUY/MAKE/SELL…). */
  afterItems: HTMLElement[];
  /** Header nav / icons. */
  chrome: HTMLElement[];
  skipButton?: HTMLElement | null;
}

export interface IntroOptions {
  THREE: Three;
  gsap: Gsap;
  el: IntroElements;
  assets: IntroAssets;
  onComplete?: () => void;
}

export interface IntroHandle {
  skip: () => void;
  destroy: () => void;
}

const GOLD = [1.0, 194 / 255, 0.0];
const FALLBACK_ASPECT = 540 / 190;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform float uReveal;
  uniform float uWipe;
  uniform float uSheen;
  uniform float uOpacity;
  uniform float uShade;
  uniform float uAspect;
  uniform float uMirror;   // 1 = floor reflection (fades with distance)
  uniform vec2  uLight;
  uniform vec3  uGold;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec4 t = texture2D(uMap, vUv);
    if (t.a < 0.01) discard;

    float n = noise(vUv * vec2(6.3 * uAspect, 9.0)) * 0.75 + noise(vUv * 60.0) * 0.25;
    float r = uReveal * 1.12;
    float vis = smoothstep(n - 0.04, n + 0.04, r);
    float edge = clamp(1.0 - abs(n - r) / 0.05, 0.0, 1.0) * step(0.001, uReveal) * (1.0 - step(0.999, uReveal));
    float wipe = 1.0 - smoothstep(uWipe - 0.015, uWipe + 0.002, vUv.x);

    vec2 d = (vUv - uLight) * vec2(uAspect, 1.0);
    float light = 0.34 + 1.05 * exp(-dot(d, d) * 1.4);

    float band = vUv.x * uAspect * 0.35 + vUv.y * 0.35 - uSheen;
    float sheen = exp(-band * band * 160.0);

    vec3 col = t.rgb * light * uShade;
    col += vec3(1.0, 0.94, 0.75) * sheen * 0.85 * uShade;
    col += uGold * edge * 1.5;

    float a = t.a * vis * wipe * uOpacity;
    a *= mix(1.0, (1.0 - smoothstep(0.0, 0.75, vUv.y)), uMirror);
    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.05 + aSeed * 0.08) + 4.0, 8.0) - 4.0;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.08;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPixelRatio * (10.0 / -mv.z);
    vSeed = aSeed;
  }
`;

const DUST_FRAG = /* glsl */ `
  precision mediump float;
  uniform vec3 uGold;
  uniform float uOpacity;
  uniform float uTime;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float a = smoothstep(0.5, 0.0, length(c));
    float twinkle = 0.55 + 0.45 * sin(uTime * (1.0 + vSeed * 2.0) + vSeed * 40.0);
    gl_FragColor = vec4(uGold, a * a * uOpacity * twinkle);
  }
`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// Smooth "flight" curve for scene 4: quick launch, long soft landing.
const easeFlight = (t: number) => 1 - Math.pow(1 - t, 4);

function loadTexture(THREE: Three, url?: string | null): Promise<ThreeNS.Texture | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (t) => resolve(t), undefined, () => resolve(null));
  });
}

/** Puts every element straight into its finished state (no WebGL needed). */
export function showFinalState(gsap: Gsap, el: IntroElements) {
  gsap.set([...el.heroItems, el.plate, ...el.afterItems, ...el.chrome, ...el.stampLetters], {
    clearProps: "opacity,visibility,transform,filter",
  });
  el.stamp.hidden = true;
  el.plate.classList.add("is-ready");
  el.slot.style.visibility = "visible";
  el.overlay.classList.remove("is-on");
  document.documentElement.classList.remove("rk-intro-pending");
  if (el.skipButton) el.skipButton.hidden = true;
}

export async function createIntro(o: IntroOptions): Promise<IntroHandle> {
  const { THREE, gsap, el } = o;

  // Bail out cleanly (page stays usable) if either library failed to load.
  if (!gsap || typeof gsap.timeline !== "function" || !THREE || typeof THREE.WebGLRenderer !== "function") {
    el.overlay.classList.remove("is-on");
    el.slot.style.visibility = "visible";
    document.documentElement.classList.remove("rk-intro-pending");
    throw new Error("Intro libraries unavailable");
  }

  // Hide the hero behind the black backdrop from the very first frame.
  el.overlay.classList.add("is-on");
  el.slot.style.visibility = "hidden";
  gsap.set(el.heroItems, { autoAlpha: 0, y: 26 });
  gsap.set(el.plate, { autoAlpha: 0, y: 30, rotateX: 72, transformPerspective: 1000, transformOrigin: "50% 100%" });
  el.plate.classList.remove("is-ready");
  // The S-E-A-R-C-H stamp is no longer used: the plate simply rises in, ready to type on.
  el.stamp.hidden = true;
  gsap.set(el.afterItems, { autoAlpha: 0, y: 24 });
  gsap.set(el.chrome, { autoAlpha: 0 });
  gsap.set(el.introSloganChars, { opacity: 0, y: 12, filter: "blur(8px)" });
  gsap.set(el.overlay, { autoAlpha: 1 });
  gsap.set([el.backdrop, el.introSlogan, el.flare], { opacity: 1 });
  gsap.set(el.backdrop, { yPercent: 0 });
  gsap.set(el.bars, { scaleY: 1, yPercent: 0 });

  let renderer: ThreeNS.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: el.canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    showFinalState(gsap, el);
    throw err;
  }
  renderer.setClearColor(0x000000, 0);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const [wordTex, crownTex] = await Promise.all([loadTexture(THREE, o.assets.wordmark), loadTexture(THREE, o.assets.crown)]);
  if (!wordTex) {
    renderer.dispose();
    showFinalState(gsap, el);
    throw new Error("REG KING wordmark could not be loaded");
  }
  const hasCrown = !!crownTex;
  const markCrop = o.assets.markCrop ?? 212 / 540;

  const texAspect = (t: ThreeNS.Texture) => {
    const img = t.image as { width?: number; height?: number } | undefined;
    return img && img.width && img.height ? img.width / img.height : FALLBACK_ASPECT;
  };
  for (const t of [wordTex, crownTex]) {
    if (!t) continue;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.needsUpdate = true;
  }

  const disposables: { dispose: () => void }[] = [];

  function buildLogo(tex: ThreeNS.Texture, layers: number, mirror = false) {
    const aspect = texAspect(tex);
    const group = new THREE.Group();
    const geo = new THREE.PlaneGeometry(1, 1 / aspect);
    disposables.push(geo);
    const mats: ThreeNS.ShaderMaterial[] = [];
    for (let i = layers; i >= 0; i--) {
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMap: { value: tex },
          uReveal: { value: 0 },
          uWipe: { value: 1 },
          uSheen: { value: -1 },
          uOpacity: { value: mirror ? 0.2 : 1 },
          uShade: { value: i === 0 ? 1 : 0.4 - (i / layers) * 0.3 },
          uAspect: { value: aspect },
          uMirror: { value: mirror ? 1 : 0 },
          uLight: { value: new THREE.Vector2(0.2, 1.2) },
          uGold: { value: new THREE.Vector3(GOLD[0], GOLD[1], GOLD[2]) },
        },
      });
      disposables.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = -i * 0.0045;
      mesh.renderOrder = layers - i;
      group.add(mesh);
      mats.push(mat);
    }
    return { group, mats, aspect };
  }

  const small = window.innerWidth < 700;
  const layerCount = small ? 8 : 14;
  const word = buildLogo(wordTex, layerCount);
  const wordMirror = buildLogo(wordTex, 0, true);
  const crown = crownTex ? buildLogo(crownTex, layerCount) : null;
  const crownMirror = crownTex ? buildLogo(crownTex, 0, true) : null;
  disposables.push(wordTex);
  if (crownTex) disposables.push(crownTex);

  const pivot = new THREE.Group();
  for (const g of [word, wordMirror, crown, crownMirror]) if (g) pivot.add(g.group);
  scene.add(pivot);

  // Gold dust
  const dustCount = small ? 160 : 360;
  const dustGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(dustCount * 3);
  const size = new Float32Array(dustCount);
  const seed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
    pos[i * 3 + 2] = -Math.random() * 6 + 1.5;
    size[i] = 1 + Math.random() * 3;
    seed[i] = Math.random();
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    vertexShader: DUST_VERT,
    fragmentShader: DUST_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: pixelRatio },
      uOpacity: { value: 0 },
      uGold: { value: new THREE.Vector3(GOLD[0], GOLD[1], GOLD[2]) },
    },
  });
  scene.add(new THREE.Points(dustGeo, dustMat));
  disposables.push(dustGeo, dustMat);

  /* ---------------------------------------------------------------- */
  const st = {
    reveal: 0,
    p2: 0,
    p4: 0,
    rotY: 0.6,
    rotX: 0.08,
    sheen: -1,
    lightX: -0.3,
    lightY: 1.3,
    dust: 0,
    mirror: 1,
    floor: 0, // 0 = streak at screen centre, 1 = floor under the logo
  };
  // GSAP tweens this; applyPose owns the streak's transform.
  const flareProxy = { sx: 0 };

  let W = 1, H = 1, vh = 1, vw = 1;
  let slotCX = 0, slotCY = 0, slotW = 1;

  function layout() {
    // The overlay is fixed + inset:0, so it excludes any desktop scrollbar.
    W = Math.max(1, el.overlay.clientWidth || window.innerWidth);
    H = Math.max(1, el.overlay.clientHeight || window.innerHeight);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    vh = 2 * camera.position.z * Math.tan(((camera.fov / 2) * Math.PI) / 180);
    vw = vh * camera.aspect;
    const s = el.slot.getBoundingClientRect();
    slotCX = ((s.left + s.width / 2) / W - 0.5) * vw;
    slotCY = (0.5 - (s.top + s.height / 2) / H) * vh;
    slotW = (s.width / W) * vw;
  }

  const toPxY = (worldY: number) => H / 2 - (worldY / vh) * H;

  function applyPose() {
    const wf = Math.min(vw * (small ? 0.78 : 0.56), vh * 1.05, 5.4);
    const p2 = easeInOut(st.p2);
    const p4 = easeFlight(st.p4);

    const markZoom = hasCrown ? 1 : 1.55;
    const sIntro = wf * lerp(markZoom, 1, p2);
    const s = lerp(sIntro, slotW, p4);
    const introY = vh * 0.06;
    const rOffset = hasCrown ? 0 : -(markCrop / 2 - 0.5) * sIntro * (1 - p2);
    // Arc the flight slightly upward so it reads as a deliberate move.
    const x = lerp(rOffset, slotCX, p4);
    const y = lerp(introY, slotCY, p4) + Math.sin(p4 * Math.PI) * vh * 0.04;

    word.group.scale.setScalar(s);
    word.group.position.set(x, y, 0);
    const wordH = s / word.aspect;

    const wipe = hasCrown ? 1 : lerp(markCrop + 0.01, 1, p2);
    const wordReveal = hasCrown ? Math.min(1, st.p2 * 1.4) : st.reveal;
    const setU = (mats: ThreeNS.ShaderMaterial[], reveal: number, w: number, opacity?: number) => {
      for (const m of mats) {
        m.uniforms.uWipe.value = w;
        m.uniforms.uReveal.value = reveal;
        m.uniforms.uSheen.value = st.sheen;
        (m.uniforms.uLight.value as ThreeNS.Vector2).set(st.lightX, st.lightY);
        if (opacity !== undefined) m.uniforms.uOpacity.value = opacity;
      }
    };
    setU(word.mats, wordReveal, wipe);

    // Floor reflection directly under the logo, fading out as it takes off.
    const gap = wordH * 0.06;
    wordMirror.group.scale.set(s, -s, s);
    wordMirror.group.position.set(x, y - wordH - gap, -0.05);
    setU(wordMirror.mats, wordReveal, wipe, 0.22 * st.mirror * (1 - Math.min(1, st.p4 * 3)));

    if (crown && crownMirror) {
      const cwIntro = Math.min(vw * 0.3, vh * 0.5);
      const cw = lerp(cwIntro, s * 0.26, p2);
      const crownH = cw / crown.aspect;
      const cy = lerp(introY, y + wordH / 2 + crownH / 2 + s * 0.03, p2);
      crown.group.scale.setScalar(cw);
      crown.group.position.set(x, cy, 0.01);
      setU(crown.mats, st.reveal, 1);
      crownMirror.group.visible = st.p2 < 0.05;
      crownMirror.group.scale.set(cw, -cw, cw);
      crownMirror.group.position.set(x, cy - crownH - gap, -0.05);
      setU(crownMirror.mats, st.reveal, 1, 0.22 * st.mirror);
    }

    pivot.rotation.y = st.rotY * (1 - p4);
    pivot.rotation.x = st.rotX * (1 - p4);
    dustMat.uniforms.uOpacity.value = st.dust;

    // DOM: floor line + intro slogan follow the logo's baseline.
    const basePx = toPxY(introY - sIntro / word.aspect / 2);
    const floorPx = lerp(H / 2, basePx + 2, st.floor);
    el.flare.style.transform = `translate3d(0, ${floorPx.toFixed(1)}px, 0) scaleX(${flareProxy.sx.toFixed(3)})`;
    const reflPx = ((sIntro / word.aspect) / vh) * H * 0.5;
    el.introSlogan.style.transform = `translate3d(-50%, ${(basePx + reflPx + H * 0.035).toFixed(1)}px, 0)`;
  }

  /* ---------------------------------------------------------------- */
  let raf = 0;
  let alive = true;
  const t0 = performance.now();
  function frame() {
    raf = 0;
    if (!alive) return;
    dustMat.uniforms.uTime.value = (performance.now() - t0) / 1000;
    applyPose();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }
  const onResize = () => layout();
  window.addEventListener("resize", onResize);

  layout();


  let finished = false;
  let handedOff = false;

  function release() {
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    for (const d of disposables) d.dispose();
    renderer.dispose();
  }

  /** Logo has landed: show the real header logo and free the GPU. */
  function handoff() {
    if (handedOff) return;
    handedOff = true;
    el.slot.style.visibility = "visible";
    el.canvas.style.visibility = "hidden";
    if (alive) release();
  }

  const finish = (instant = false) => {
    if (finished) return;
    finished = true;
    handoff();
    if (instant) gsap.set([el.backdrop], { yPercent: -100 });
    showFinalState(gsap, el);
    gsap.set([el.overlay, el.backdrop, el.bars, el.introSlogan, el.flare, ...el.introSloganChars], {
      clearProps: "opacity,visibility,transform,filter",
    });
    el.canvas.style.removeProperty("visibility");
    o.onComplete?.();
  };

  // How long the logo and slogan stay on screen before the curtain lifts (seconds).
  const HOLD = 1.0;
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
  tl.eventCallback("onComplete", () => finish(false));

  // Scene 1: light streak, then the mark is revealed by light
  tl.to(flareProxy, { sx: 1, duration: 0.6, ease: "expo.out" }, 0)
    .to(st, { dust: 1, duration: 1.0, ease: "sine.out" }, 0)
    .to(st, { reveal: 1, duration: 0.8, ease: "power2.inOut" }, 0.2)
    .to(st, { rotY: 0.08, rotX: 0, duration: 1.0, ease: "power3.out" }, 0.2)
    .to(st, { lightX: 0.6, lightY: 0.55, duration: 1.2, ease: "sine.inOut" }, 0.2)
    .to(st, { floor: 1, duration: 0.7, ease: "power3.inOut" }, 0.4)
    .to(flareProxy, { sx: 0.62, duration: 0.7, ease: "power3.inOut" }, 0.4)
    // Scene 2: full wordmark, sheen, slogan
    .to(st, { p2: 1, duration: 0.6, ease: "none" }, 0.95)
    .to(st, { rotY: 0, duration: 0.6 }, 0.95)
    .fromTo(st, { sheen: -0.5 }, { sheen: 1.9, duration: 0.8, ease: "power2.inOut" }, 1.0)
    .to(el.introSloganChars, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, stagger: 0.02 }, 1.15)
    // Scene 3: logo to the header; the black lifts like a curtain onto yellow
    .to([el.introSlogan, el.flare], { opacity: 0, duration: 0.2, ease: "power1.in" }, 1.75 + HOLD)
    .to(st, { dust: 0, duration: 0.4 }, 1.75 + HOLD)
    .to(st, { p4: 1, duration: 0.65, ease: "none" }, 1.8 + HOLD)
    .to(el.bars, { scaleY: 0, duration: 0.4, ease: "power3.inOut" }, 1.8 + HOLD)
    .to(el.backdrop, { yPercent: -100, duration: 0.7, ease: "power3.inOut" }, 1.85 + HOLD)
    .to(el.chrome, { autoAlpha: 1, duration: 0.4 }, 2.0 + HOLD)
    .call(handoff, [], 2.46 + HOLD)
    // Scene 4: the plate rises in, ready to type on; the rest follows
    .to(el.heroItems, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power3.out" }, 2.05 + HOLD)
    .to(el.plate, { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.55, ease: "power3.out" }, 2.25 + HOLD)
    .call(() => el.plate.classList.add("is-ready"), [], 2.3 + HOLD)
    .to(el.afterItems, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06, ease: "power3.out" }, 2.45 + HOLD);

  raf = requestAnimationFrame(frame);
  tl.play();

  return {
    skip() {
      if (finished) return;
      tl.kill();
      finish(true);
    },
    destroy() {
      tl.kill();
      if (!finished) {
        finished = true;
        showFinalState(gsap, el);
      }
      if (alive) release();
    },
  };
}
