/**
 * Makes the slow letters (Retro / Vintage chisel, 3D Gel dome) in background workers, a few at once,
 * and stores them in lib/plate3d.ts so the 3D plate builds straight away.
 *
 * - `lettersFor(specs)`: what these plates still need (empty for most styles, or once made).
 * - `makeLetters(jobs)`: make them now, ahead of anything waiting in the background.
 * - `warmLetters(specs)`: make them when there's nothing more urgent (the styles the customer may try next).
 * - `lettersReady(specs)`: wait for them without hurrying them along.
 *
 * If workers can't start (an old browser, or the preview), the letters are made on the page itself,
 * one at a time with a pause between, so it's slower but always works.
 */
import { chiselArrays, domeArrays } from "./plateGeoCore";
import { keepLetter, letterKey, missingLetters, type LetterJob } from "./plate3d";
import type { PlateSpec } from "./plateRender";

type Task = { key: string; job: LetterJob; urgent: boolean; done: Promise<void>; resolve: () => void };
type Slot = { w: Worker; task: Task | null };

const tasks = new Map<string, Task>(); // waiting or being made
const queue: Task[] = []; // waiting, most urgent first
let pool: Slot[] | false | null = null;
let started = false; // a worker has said it's loaded
let seq = 0;
const byId = new Map<number, Task>();

function startWorker(): Worker {
  return new Worker(new URL("./plateGeo.worker.ts", import.meta.url), { type: "module" });
}

function getPool(): Slot[] | false {
  if (pool !== null) return pool;
  try {
    if (typeof Worker === "undefined") throw new Error("no workers");
    const n = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
    pool = Array.from({ length: n }, () => {
      const slot: Slot = { w: startWorker(), task: null };
      slot.w.onmessage = (e: MessageEvent<{ ready?: boolean; id: number; pos?: Float32Array; nor?: Float32Array; error?: string }>) => {
        if (e.data.ready) {
          started = true;
          return;
        }
        const t = byId.get(e.data.id);
        byId.delete(e.data.id);
        slot.task = null;
        if (t) {
          if (e.data.pos && e.data.nor) finish(t, { pos: e.data.pos, nor: e.data.nor });
          else onPage(t);
        }
        pump();
      };
      // the worker couldn't load: make everything on the page from now on
      slot.w.onerror = (e) => {
        e.preventDefault?.();
        giveUp();
      };
      return slot;
    });
    // A worker that fails while loading may not say so: if none has said it's ready in a few
    // seconds, stop waiting for them and make the letters on the page.
    setTimeout(() => {
      if (!started) giveUp();
    }, 4000);
  } catch {
    pool = false;
  }
  return pool;
}

function giveUp() {
  if (!pool) return;
  const stuck = pool.map((s) => s.task).filter((t): t is Task => !!t);
  pool.forEach((s) => s.w.terminate());
  pool = false;
  byId.clear();
  queue.unshift(...stuck);
  pump();
}

function finish(t: Task, a: { pos: Float32Array; nor: Float32Array }) {
  keepLetter(t.job, a);
  tasks.delete(t.key);
  t.resolve();
}

/** Make a letter on the page itself (no workers). */
function onPage(t: Task) {
  try {
    finish(t, t.job.kind === "chisel" ? chiselArrays(t.job.ch, t.job.riseU) : domeArrays(t.job.ch, t.job.k, t.job.wall, t.job.rise));
  } catch {
    tasks.delete(t.key);
    t.resolve(); // the plate will make it itself if it's still needed
  }
}

let pageBusy = false;
function pump() {
  const p = getPool();
  if (p) {
    for (const slot of p) {
      if (slot.task) continue;
      const t = queue.shift();
      if (!t) return;
      slot.task = t;
      const id = ++seq;
      byId.set(id, t);
      slot.w.postMessage({ id, job: t.job });
      // a letter normally takes well under a second; if a worker goes quiet, make it here instead
      const mine = t;
      setTimeout(() => {
        if (tasks.get(mine.key) === mine && slot.task === mine) giveUp();
      }, 15000);
    }
    return;
  }
  // no workers: one letter at a time, letting the page paint in between
  if (pageBusy || !queue.length) return;
  pageBusy = true;
  setTimeout(() => {
    const t = queue.shift();
    if (t) onPage(t);
    pageBusy = false;
    pump();
  }, 16);
}

function ask(job: LetterJob, urgent: boolean): Promise<void> {
  const key = letterKey(job);
  const had = tasks.get(key);
  if (had) {
    if (urgent && !had.urgent) {
      had.urgent = true;
      const i = queue.indexOf(had);
      if (i > 0) {
        queue.splice(i, 1);
        queue.splice(queue.filter((q) => q.urgent).length, 0, had);
      }
    }
    return had.done;
  }
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r));
  const t: Task = { key, job, urgent, done, resolve };
  tasks.set(key, t);
  if (urgent) queue.splice(queue.filter((q) => q.urgent).length, 0, t);
  else queue.push(t);
  pump();
  return done;
}

/** The letters these plates still need, each once. */
export function lettersFor(specs: PlateSpec[]): LetterJob[] {
  const all = new Map<string, LetterJob>();
  for (const s of specs) for (const j of missingLetters(s)) all.set(letterKey(j), j);
  return [...all.values()];
}

/** Make these letters now, before anything waiting in the background. */
export function makeLetters(jobs: LetterJob[]): Promise<void> {
  return Promise.all(jobs.map((j) => ask(j, true))).then(() => undefined);
}

/** Resolves once the background has made these plates' letters (or given up on them). */
export function lettersReady(specs: PlateSpec[]): Promise<void> {
  return Promise.all(lettersFor(specs).map((j) => ask(j, false))).then(() => undefined);
}

/**
 * Make what these plates need when nothing's more urgent. Replaces any earlier background list
 * that hasn't started (the customer has moved on, e.g. typed another letter).
 */
export function warmLetters(specs: PlateSpec[]) {
  for (let i = queue.length - 1; i >= 0; i--) {
    const t = queue[i];
    if (t.urgent) continue;
    queue.splice(i, 1);
    tasks.delete(t.key);
    t.resolve();
  }
  for (const j of lettersFor(specs)) void ask(j, false);
}
