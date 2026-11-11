/**
 * Background worker: makes the chiselled (Retro / Vintage) and domed (3D Gel) letters off the page's
 * own thread, so the builder stays responsive while a new style is being made.
 */
import "./workerWindow"; // must come first
import { chiselArrays, domeArrays } from "./plateGeoCore";
import type { LetterJob } from "./plate3d";

type Ask = { id: number; job: LetterJob };
const post = (self as unknown as { postMessage(m: unknown, transfer: Transferable[]): void }).postMessage.bind(self);

// tell the page this worker has loaded and is ready for letters
post({ ready: true }, []);

self.onmessage = (e: MessageEvent<Ask>) => {
  const { id, job } = e.data;
  try {
    const r = job.kind === "chisel" ? chiselArrays(job.ch, job.riseU) : domeArrays(job.ch, job.k, job.wall, job.rise);
    post({ id, pos: r.pos, nor: r.nor }, [r.pos.buffer, r.nor.buffer]);
  } catch (err) {
    post({ id, error: String(err) }, []);
  }
};
