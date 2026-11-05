/**
 * Builds the favicons from the official logo file (never redrawn):
 * the gold "R" (the first 212px of the 540px wordmark), centred on black.
 *   app/favicon.ico (16, 32, 48)   app/icon.png (512)   app/apple-icon.png (180)
 * Run: node scripts/make-favicons.mjs   (needs `sharp`: npm i -D sharp)
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const LOGO = "public/brand/regking-logo.png";
const MARK_W = 212; // gold R occupies 0-212px of the 540px wordmark (see assets.markCrop)

async function square(size, pad = 0.14) {
  const inner = Math.round(size * (1 - pad * 2));
  const mark = await sharp(LOGO).extract({ left: 0, top: 0, width: MARK_W, height: 190 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#000000" } })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toBuffer();
}

/** ICO file holding PNG images (supported by all current browsers). */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(pngs.length, 4);
  let offset = head.length;
  pngs.forEach(({ size, buf }, i) => {
    const e = 6 + i * 16;
    head.writeUInt8(size >= 256 ? 0 : size, e);
    head.writeUInt8(size >= 256 ? 0 : size, e + 1);
    head.writeUInt8(0, e + 2);
    head.writeUInt8(0, e + 3);
    head.writeUInt16LE(1, e + 4);
    head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(buf.length, e + 8);
    head.writeUInt32LE(offset, e + 12);
    offset += buf.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.buf)]);
}

const sizes = [16, 32, 48];
const pngs = [];
for (const size of sizes) pngs.push({ size, buf: await square(size, size <= 16 ? 0.06 : 0.1) });
writeFileSync("app/favicon.ico", ico(pngs));
writeFileSync("app/icon.png", await square(512));
writeFileSync("app/apple-icon.png", await square(180));
console.log("favicons written: app/favicon.ico, app/icon.png, app/apple-icon.png");
