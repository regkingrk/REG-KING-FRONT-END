/**
 * Loaded first in the background worker. The site's build treats `typeof window` as always true in
 * browser code, so three.js reaches for `window` as it loads; a worker has no window, so point it at
 * the worker's own global.
 */
const g = globalThis as unknown as { window?: unknown };
if (g.window === undefined) g.window = globalThis;
export {};
