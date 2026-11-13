"use client";

/**
 * The 3D view in the plate builder: real 3D plates (lib/plate3d.ts) the customer can drag to turn and
 * zoom with the + and − buttons. It draws only when something changes, so it costs nothing at rest.
 * If the browser can't do 3D, Plate3D shows its 2D picture instead.
 */
import { useEffect, useRef, useState } from "react";
import { stylesFor, type BuildConfig } from "@/lib/builder";
import { specFrom, plateFontReady } from "@/lib/plateRender";
import { lettersFor, lettersReady, makeLetters, warmLetters } from "@/lib/plateGeoClient";
import { THREE, acrylicEnvironment, buildPlate, disposeGroup, releaseLetters, studioEnvironment } from "@/lib/plate3d";

type Side = "front" | "rear";
const START = { yaw: 0, pitch: 0 };
// 4D acrylic and Metal Press open turned further, looking down on the letters, so you see how far they stand out
const START_4D = START;
const is4D = (style: string | null | undefined) => /^4D |^Retro|^Vintage|^RK$|^Silver Retro/.test(style ?? "") || /^Metal Press/.test(style ?? "");
const MIN_Z = 0.7;
type View = { yaw: number; pitch: number; zoom: number };
/** Ready-made angles to look at the plates from. */
const VIEWS: { name: string; v: View }[] = [
  { name: "Straight on", v: { yaw: 0, pitch: 0, zoom: 1 } },
  { name: "From the left", v: { yaw: -0.75, pitch: 0.18, zoom: 1 } },
  { name: "From the right", v: { yaw: 0.75, pitch: 0.18, zoom: 1 } },
  { name: "From above", v: { yaw: -0.2, pitch: 0.7, zoom: 1 } },
  { name: "Close-up", v: { yaw: -0.55, pitch: 0.3, zoom: 2.3 } },
];
const MAX_Z = 5;
/** After the next screen update (or a moment, if the page isn't being drawn), never waiting for ever. */
const nextPaint = () =>
  new Promise<void>((r) => {
    const t = setTimeout(r, 120);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      clearTimeout(t);
      r();
    }));
  });


/**
 * `groups`/`groupsKey`: draw something other than the builder's plates (the surround maker passes its
 * surrounds), rebuilt whenever `groupsKey` changes.
 */
export function PlateGL({
  reg = "",
  c,
  sides = [],
  onFail,
  groups,
  groupsKey,
  angles = true,
  tight = false,
  day = false,
}: {
  reg?: string;
  c?: BuildConfig;
  sides?: Side[];
  onFail: () => void;
  groups?: (softEnv?: THREE.Texture, acrylicEnv?: THREE.Texture) => THREE.Group[];
  groupsKey?: string;
  /** Show the ready-made angle buttons (the plate builder does; the surround maker doesn't). */
  angles?: boolean;
  /** Fill the view more (less margin round the plates): the surround maker. */
  tight?: boolean;
  /** Daylight: a brighter scene, to see the plates as they look outside in the day. */
  day?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{ setPlates: (g: THREE.Group[], lay?: boolean) => void; reset: () => void; view: (v: View) => void; zoomBy: (f: number) => void; setStart: (v: { yaw: number; pitch: number }) => void; prepare: (g: THREE.Group) => Promise<void> } | null>(null);
  // "Building your plate" shows while a style is made for the first time
  const [building, setBuilding] = useState(false);
  // styles already shown or got ready in this view (their look is ready on the graphics card)
  const seen = useRef(new Set<string>());
  // the style on show, so a change of style (not of reg) lays the letters on
  const shownStyle = useRef<string | null | undefined>(undefined);
  const [zoom, setZoom] = useState(1);
  // the % shown between the buttons follows the view as it zooms
  const onZoom = useRef((v: number) => setZoom(Math.round(v * 20) / 20));
  const [ready, setReady] = useState(false);
  const tightRef = useRef(tight);
  tightRef.current = tight;
  const softEnv = useRef<THREE.Texture | null>(null);
  const lights = useRef<{ renderer: THREE.WebGLRenderer; key: THREE.DirectionalLight; fill: THREE.AmbientLight } | null>(null);
  const acrylicEnv = useRef<THREE.Texture | null>(null);

  // Day or night light on the plates (the builder's Day / Night switch)
  useEffect(() => {
    const l = lights.current;
    if (!l) return;
    l.renderer.toneMappingExposure = day ? 1.12 : 1;
    l.fill.intensity = day ? 0.75 : 0.45;
    l.key.intensity = day ? 2.2 : 1.9;
    window.dispatchEvent(new Event("rk-gl-redraw"));
  }, [day, ready]);

  // The scene: made once.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      onFail();
      return;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const prepared: THREE.Material[] = [];
    scene.environment = studioEnvironment(renderer);
    softEnv.current = studioEnvironment(renderer, false);
    acrylicEnv.current = acrylicEnvironment(renderer);
    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(-180, 260, 420);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -340;
    key.shadow.camera.right = 340;
    key.shadow.camera.top = 260;
    key.shadow.camera.bottom = -260;
    key.shadow.radius = 4;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.35; // no shadow speckle on shallow faces such as Retro's facets
    const fill = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(key, fill);
    lights.current = { renderer, key, fill };

    const camera = new THREE.PerspectiveCamera(26, 1, 10, 5000);
    const rig = new THREE.Group();
    scene.add(rig);

    // view: turn (yaw, pitch), zoom (1 = the plates fill the view) and pan (mm), each easing to its target
    let start = START;
    let yaw = START.yaw, pitch = START.pitch, tYaw = yaw, tPitch = pitch, z = 1, tz = 1, panX = 0, panY = 0, tPanX = 0, tPanY = 0;
    let raf = 0, span = { w: 520, h: 111 }, dist = 1000;
    const fov = (camera.fov * Math.PI) / 180;
    const half = (zoom: number) => {
      const h = (Math.tan(fov / 2) * dist) / zoom;
      return { h, w: h * camera.aspect };
    };
    const frame = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // fit the plates to the view with a margin, then zoom and pan
      // (more room when the starting view is turned further, so the tilted plates still fit)
      const mH = tightRef.current ? 1.08 : 1.25, mW = tightRef.current ? 1.04 : 1.18;
      const needH = span.h * (mH + Math.max(0, Math.abs(start.pitch) - 0.24) * 1.2), needW = span.w * (mW + Math.max(0, Math.abs(start.yaw) - 0.44) * 0.5);
      dist = Math.max(needH / (2 * Math.tan(fov / 2)), needW / (2 * Math.tan(fov / 2) * camera.aspect));
      camera.position.set(panX, panY, dist / z);
      camera.lookAt(panX, panY, 0);
      camera.updateProjectionMatrix();
    };
    // The reveal after a style change: the view starts turned a little so the depth shows, each
    // character rises out of the plate left to right and settles, then the plates glide back to
    // straight on. Restrained timings and easings, all driven by the clock (not the frame rate).
    const RISE = 520, STAGGER = 70, HOLD = 160, GLIDE = 950; // ms
    const TURN = { yaw: -0.38, pitch: 0.26 }, TURN_ZOOM = 0.84; // turned, and a little further back so both plates fit
    const easeOutBack = (t: number) => 1 + 2.1 * Math.pow(t - 1, 3) + 1.1 * Math.pow(t - 1, 2); // a gentle 3% settle
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    type LayItem = { m: THREE.Object3D; n: number; z: number; floor: number; sz: number };
    let lay: { t0: number; items: LayItem[]; letters: number; from: { yaw: number; pitch: number } | null } | null = null;
    const layStep = () => {
      if (!lay) return false;
      const now = performance.now() - lay.t0;
      for (const it of lay.items) {
        const t = Math.max(0, Math.min(1, (now - it.n * STAGGER) / RISE));
        const e = t === 0 ? 0 : easeOutBack(t);
        it.m.visible = t > 0;
        // the whole stack of a letter (4D Gel, Retro X) grows from the plate's surface together
        it.m.scale.z = Math.max(0.0001, it.sz * e);
        it.m.position.z = it.floor + (it.z - it.floor) * e;
      }
      const lettersDone = lay.letters ? (lay.letters - 1) * STAGGER + RISE : 0;
      if (lay.from) {
        const g = Math.max(0, Math.min(1, (now - lettersDone - HOLD) / GLIDE));
        const e = easeInOut(g);
        yaw = tYaw = lay.from.yaw + (start.yaw - lay.from.yaw) * e;
        pitch = tPitch = lay.from.pitch + (start.pitch - lay.from.pitch) * e;
        z = tz = TURN_ZOOM + (1 - TURN_ZOOM) * e;
      }
      const done = now >= lettersDone + (lay.from ? HOLD + GLIDE : 0);
      if (done) lay = null;
      return !done;
    };
    // the customer grabs the plates: hand the view straight back to them
    const stopGlide = () => {
      if (lay) lay.from = null;
    };
    const draw = () => {
      raf = 0;
      const laying = layStep();
      yaw += (tYaw - yaw) * 0.18;
      pitch += (tPitch - pitch) * 0.18;
      z += (tz - z) * 0.22;
      panX += (tPanX - panX) * 0.22;
      panY += (tPanY - panY) * 0.22;
      rig.rotation.set(pitch, yaw, 0);
      frame();
      renderer.render(scene, camera);
      onZoom.current(z);
      const moving = [tYaw - yaw, tPitch - pitch, tz - z, (tPanX - panX) / 100, (tPanY - panY) / 100].some((d) => Math.abs(d) > 0.0005);
      if (moving || laying) raf = requestAnimationFrame(draw);
    };
    const ask = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    // a picture (logo or upload) finished loading: draw again
    window.addEventListener("rk-gl-redraw", ask);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const jump = () => {
      if (reduce) {
        yaw = tYaw;
        pitch = tPitch;
        z = tz;
        panX = tPanX;
        panY = tPanY;
      }
      ask();
    };
    const clampPan = () => {
      const lim = Math.max(0, 1 - 1 / tz);
      tPanX = Math.max(-span.w * 0.6 * lim, Math.min(span.w * 0.6 * lim, tPanX));
      tPanY = Math.max(-span.h * 0.6 * lim, Math.min(span.h * 0.6 * lim, tPanY));
    };
    /** Zoom to `next`, keeping the point under (nx, ny) (-1..1 across the view) where it is. */
    const zoomAt = (next: number, nx = 0, ny = 0) => {
      next = Math.max(MIN_Z, Math.min(MAX_Z, next));
      const a = half(tz), b = half(next);
      const wx = tPanX + nx * a.w, wy = tPanY + ny * a.h;
      tPanX = wx - nx * b.w;
      tPanY = wy - ny * b.h;
      tz = next;
      clampPan();
      jump();
    };
    const ndc = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      return { nx: ((cx - r.left) / r.width) * 2 - 1, ny: -(((cy - r.top) / r.height) * 2 - 1) };
    };

    // the scroll wheel (and a trackpad pinch) zooms towards the pointer
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      stopGlide();
      const { nx, ny } = ndc(e.clientX, e.clientY);
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(tz * Math.exp(-d * 0.0018), nx, ny);
    };

    // one finger or the mouse turns the plates; Shift + drag pans; two fingers pinch to zoom and pan
    const pts = new Map<number, { x: number; y: number }>();
    let px = 0, py = 0, pinch = 0;
    const down = (e: PointerEvent) => {
      stopGlide();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);
      px = e.clientX;
      py = e.clientY;
      if (pts.size === 2) {
        const [p1, p2] = [...pts.values()];
        pinch = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      }
    };
    const move = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const [p1, p2] = [...pts.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (pinch > 0) {
          const { nx, ny } = ndc((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
          zoomAt(tz * (d / pinch), nx, ny);
        }
        pinch = d;
        return;
      }
      const dx = e.clientX - px, dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      if (e.shiftKey && tz > 1) {
        const r = el.getBoundingClientRect(), hv = half(tz);
        tPanX -= (dx / r.width) * 2 * hv.w;
        tPanY += (dy / r.height) * 2 * hv.h;
        clampPan();
      } else {
        tYaw = Math.max(-1.1, Math.min(1.1, tYaw + dx * 0.008));
        tPitch = Math.max(-0.7, Math.min(0.7, tPitch + dy * 0.006));
      }
      jump();
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = 0;
      const rest = [...pts.values()][0];
      if (rest) {
        px = rest.x;
        py = rest.y;
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    const ro = new ResizeObserver(ask);
    ro.observe(el);

    api.current = {
      setPlates: (plates, layOn) => {
        lay = null;
        rig.children.slice().forEach((o) => {
          rig.remove(o);
          disposeGroup(o);
        });
        const gap = 34;
        const heights = plates.map((g) => new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3()));
        const totalH = heights.reduce((a, v) => a + v.y, 0) + gap * (plates.length - 1);
        let y = totalH / 2;
        plates.forEach((g, i) => {
          g.position.y = y - heights[i].y / 2;
          y -= heights[i].y + gap;
          rig.add(g);
        });
        span = { w: Math.max(...heights.map((v) => v.x)), h: totalH };
        if (layOn && !reduce) {
          const items: LayItem[] = [];
          plates.forEach((g) => {
            const mine: LayItem[] = [];
            g.traverse((o) => {
              if (typeof o.userData.letter === "number") mine.push({ m: o, n: o.userData.letter, z: o.position.z, floor: 0, sz: o.scale.z });
            });
            // each letter's stack rises from where its lowest layer sits
            const floors = new Map<number, number>();
            mine.forEach((it) => floors.set(it.n, Math.min(floors.get(it.n) ?? Infinity, it.z)));
            mine.forEach((it) => (it.floor = floors.get(it.n)!));
            items.push(...mine);
          });
          const letters = items.reduce((a, it) => Math.max(a, it.n + 1), 0);
          lay = { t0: performance.now(), items, letters, from: { ...TURN } };
          yaw = tYaw = TURN.yaw;
          pitch = tPitch = TURN.pitch;
          z = tz = TURN_ZOOM;
          tPanX = panX = 0;
          tPanY = panY = 0;
          layStep();
        }
        ask();
      },
      reset: () => {
        stopGlide();
        tYaw = start.yaw;
        tPitch = start.pitch;
        tz = 1;
        tPanX = 0;
        tPanY = 0;
        jump();
      },
      zoomBy: (f) => zoomAt(tz * f),
      view: (v) => {
        stopGlide();
        tYaw = v.yaw;
        tPitch = v.pitch;
        tz = Math.max(MIN_Z, Math.min(MAX_Z, v.zoom));
        tPanX = 0;
        tPanY = 0;
        jump();
      },
      // Get a style's look ready on the graphics card ahead of time (without drawing it), so the first
      // time the customer picks it there's no pause. The materials are kept so the work isn't thrown away.
      prepare: (g) => {
        const r = renderer as THREE.WebGLRenderer & { compileAsync?: (o: THREE.Object3D, c: THREE.Camera, s?: THREE.Scene) => Promise<unknown> };
        const keep = () => {
          g.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            if (!m.geometry.userData.shared) m.geometry.dispose();
            (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => {
              const map = (mt as THREE.MeshPhysicalMaterial).map;
              if (map) map.image = null; // the picture isn't needed, only the compiled look
              prepared.push(mt);
            });
          });
        };
        if (!r.compileAsync) {
          keep();
          return Promise.resolve();
        }
        return r.compileAsync(g, camera, scene).then(keep, keep);
      },
      setStart: (v) => {
        if (v === start) return;
        start = v;
        tYaw = v.yaw;
        tPitch = v.pitch;
        // the first plates shown open straight at their angle; later style changes turn to it
        if (!rig.children.length) {
          yaw = tYaw;
          pitch = tPitch;
        }
        jump();
      },
    };
    setReady(true);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("rk-gl-redraw", ask);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      rig.children.slice().forEach((o) => disposeGroup(o));
      prepared.forEach((m) => m.dispose());
      releaseLetters();
      scene.environment?.dispose();
      softEnv.current?.dispose();
      acrylicEnv.current?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The plates: rebuilt when anything about them changes.
  const key = groups ? `g:${groupsKey}` : JSON.stringify([reg, sides, c?.vehicle, c?.legal, c?.qty, c?.style, c?.size, c?.rearSize, c?.extras, c?.hexFlip, c?.bottomText, c?.spacing, c?.fadeFrom]);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    let warmTimer = 0;
    plateFontReady().then(async () => {
      if (!live || !api.current) return;
      if (groups) {
        api.current.setStart(START);
        api.current.setPlates(groups(softEnv.current ?? undefined, acrylicEnv.current ?? undefined));
        return;
      }
      if (!c) return;
      const text = reg || "YOUR REG";
      const specs = sides.map((s) => specFrom(c, text, s));
      // Retro, Vintage and 3D Gel letters take a moment the first time: say so while they're made
      const jobs = lettersFor(specs);
      const firstLook = !seen.current.has(c.style ?? "");
      if (jobs.length || firstLook) {
        setBuilding(true);
        await makeLetters(jobs);
        // let "Building your plate" show before the page is busy drawing the new style
        await nextPaint();
        if (!live || !api.current) return;
      }
      seen.current.add(c.style ?? "");
      api.current.setStart(is4D(c.style) ? START_4D : START);
      const styleChanged = shownStyle.current !== undefined && shownStyle.current !== c.style;
      shownStyle.current = c.style;
      api.current.setPlates(
        specs.map((sp) => buildPlate(sp, softEnv.current ?? undefined, acrylicEnv.current ?? undefined)),
        styleChanged,
      );
      void nextPaint().then(() => live && setBuilding(false));

      // Then, once the customer pauses, get the other styles ready for this reg in the background.
      warmTimer = window.setTimeout(() => {
        if (!live) return;
        const others = stylesFor(c.vehicle, c.legal)
          .map((st) => st.name)
          .filter((n) => n !== c.style);
        warmLetters(others.map((n) => specFrom(c, text, sides[0] ?? "rear", n)));
        // and their looks on the graphics card, one style at a time, each once its letters are made
        const next = (i: number) => {
          if (!live || !api.current || i >= others.length) return;
          const n = others[i];
          if (seen.current.has(n)) return next(i + 1);
          const sp = specFrom(c, text, sides[0] ?? "rear", n);
          void lettersReady([sp]).then(() => {
            if (!live || !api.current) return;
            if (lettersFor([sp]).length) return next(i + 1); // not made after all (moved on): skip for now
            seen.current.add(n);
            void api.current.prepare(buildPlate(sp, softEnv.current ?? undefined, acrylicEnv.current ?? undefined)).then(() => setTimeout(() => next(i + 1), 50));
          });
        };
        next(0);
      }, 900);
    });
    return () => {
      live = false;
      clearTimeout(warmTimer);
    };
  }, [ready, key]); // eslint-disable-line react-hooks/exhaustive-deps

  const step = (d: number) => api.current?.zoomBy(d > 0 ? 1.5 : 1 / 1.5);
  return (
    <div className="rk-gl" data-plate-gl data-building={building || undefined}>
      <div className="rk-gl__stage">
        <div ref={host} className="rk-gl__view" aria-hidden />
        {building && (
          <p className="rk-gl__busy" role="status">
            <span className="rk-gl__spin" aria-hidden />
            Building your plate
          </p>
        )}
      </div>
      <div className="rk-gl__tools">
        <button type="button" onClick={() => step(-1)} disabled={zoom <= MIN_Z + 0.01} aria-label="Zoom out" data-gl-zoom="out">
          −
        </button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => step(1)} disabled={zoom >= MAX_Z - 0.01} aria-label="Zoom in" data-gl-zoom="in">
          +
        </button>
        <button
          type="button"
          onClick={() => api.current?.reset()}
          aria-label="Reset the view"
          data-gl-reset
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
      {angles && <div className="rk-gl__views" role="group" aria-label="Look from">
        {VIEWS.map((x) => (
          <button key={x.name} type="button" onClick={() => api.current?.view(x.v)} data-gl-view={x.name}>
            {x.name}
          </button>
        ))}
      </div>}
    </div>
  );
}
