// Builds the single-file live preview from the REAL app code:
//   1. transpiles app/ components/ lib/ (TS/TSX) to CommonJS,
//   2. server-renders <Home /> so the page shows instantly,
//   3. bundles the same modules into a tiny in-page module loader and mounts
//      <Home /> with React from cdnjs, so every interaction (intro, plate
//      builder, tabs, countdowns) is the production component, not a copy.
// Usage: node preview/build.mjs [outFile]            builds the homepage preview
//        node preview/build.mjs --studio [outFile]   builds the in-store studio page (app/studio) instead
// (needs react, react-dom, typescript resolvable)
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from "node:fs";
import { createRequire, Module } from "node:module";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

if (!process.env.NODE_PATH) {
  try {
    process.env.NODE_PATH = execSync("npm root -g").toString().trim();
  } catch {}
}
Module._initPaths();

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const studio = args.includes("--studio");
const out = args.find((a) => !a.startsWith("--")) || join(root, "preview", "dist", studio ? "studio.html" : "index.html");
const entry = studio ? "app/studio/page.js" : "app/page.js";
const require = createRequire(join(root, "package.json"));
const ts = require("typescript");
const read = (p) => readFileSync(join(root, p), "utf8");
const SHOP = "https://regking.co.uk";

const asDataUri = (p) => {
  const f = join(root, p);
  if (!existsSync(f)) return null;
  const ext = p.split(".").pop().toLowerCase();
  const mime = { svg: "image/svg+xml", webp: "image/webp", mp4: "video/mp4", webm: "video/webm", jpg: "image/jpeg", jpeg: "image/jpeg" }[ext] || "image/png";
  return `data:${mime};base64,${readFileSync(f).toString("base64")}`;
};
const wordmark = asDataUri("public/brand/regking-logo.png");
const crown = asDataUri("public/brand/crown.svg") || asDataUri("public/brand/crown.png");

/* ---------- 1. transpile ---------- */
const walk = (dir) =>
  readdirSync(join(root, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(root, p)).isDirectory() ? walk(p) : /\.(tsx?)$/.test(f) ? [p] : [];
  });
const sources = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => !f.endsWith("layout.tsx"));
const modules = {}; // "components/PlateSearch.js" -> code
for (const src of sources) {
  const id = src.replace(/\\/g, "/").replace(/\.tsx?$/, ".js");
  let code = ts.transpileModule(read(src), {
    fileName: src,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  code = code.replace(/require\("@\/([^"]+)"\)/g, (_, p) => {
    let rel = relative(dirname(id), p).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    return `require("${rel}")`;
  });
  // Preview-only: no background workers (the single file has no worker file to load), so the
  // worker's address can't be made and the 3D letters are made on the page instead.
  code = code.split("import.meta.url").join('"about:blank"');
  // Preview-only rewrites: inline the logo, point "home" links at the live site.
  if (wordmark) code = code.split('"/brand/regking-logo.png"').join(JSON.stringify(wordmark));
  code = code.split('href: "/"').join(`href: "${SHOP}/"`);
  modules[id] = code;
}

/* ---------- 2. server-render for first paint ---------- */
const tmp = join(root, "preview", ".ssr");
rmSync(tmp, { recursive: true, force: true });
for (const [id, code] of Object.entries(modules)) {
  mkdirSync(dirname(join(tmp, id)), { recursive: true });
  writeFileSync(join(tmp, id), code);
}
// three.js only runs in the browser (the 3D view starts after the page loads), so the
// server render gets an empty stand-in when the package isn't installed here.
try {
  require.resolve("three");
} catch {
  mkdirSync(join(tmp, "node_modules", "three"), { recursive: true });
  writeFileSync(join(tmp, "node_modules", "three", "index.js"), "module.exports = {};");
}
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
let body = renderToStaticMarkup(React.createElement(require(join(tmp, entry)).default));
rmSync(tmp, { recursive: true, force: true });
body = body.replace(/<link rel="preload" as="image"[^>]*\/?>/g, "");

/* ---------- 3. client bundle ---------- */
const bundle =
  "var __RK_MODS__={" +
  Object.entries(modules)
    .map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){${code}\n}`)
    .join(",\n") +
  "};";

let html = read("preview/template.html");
const rep = (k, v) => {
  if (!html.includes(k)) throw new Error("template is missing " + k);
  html = html.split(k).join(v);
};
rep("/*__CSS__*/", read("app/globals.css"));
rep("__BODY__", body);
rep("/*__BUNDLE__*/", bundle);
rep("__CROWN_JSON__", JSON.stringify(crown));
rep("__ENTRY__", entry);
// The studio has no shop header, so the preview's header padding and "Replay intro" button go.
if (studio) html = html.replace("</title>", "</title><style>html body{padding-top:0!important}.rk-replay{display:none!important}</style>");

// Preview-only: inline the hero video and its poster (the live site serves them from /video/).
for (const asset of ["/video/hero.webm", "/video/hero.mp4", "/video/hero-poster.jpg"]) {
  const uri = asDataUri("public" + asset);
  if (uri) html = html.split(asset).join(uri);
}

// Preview-only: inline the style picker's pictures (the live site serves them from /styles/).
{
  // the style pictures and the car brand logos
  const map = Object.fromEntries(
    ["styles", "logos"].flatMap((dir) =>
      (existsSync(join(root, "public", dir)) ? readdirSync(join(root, "public", dir)) : []).filter((n) => n.endsWith(".webp")).map((f) => [`/${dir}/${f}`, asDataUri(`public/${dir}/${f}`)]),
    ),
  );
  html = html.replace("</title>", "</title><script>window.__RK_STYLE_IMAGES=" + JSON.stringify(map) + "</script>");
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log(
  `preview -> ${out} (${(html.length / 1024).toFixed(0)} KB) modules=${Object.keys(modules).length} logo=${!!wordmark} crown=${!!crown} sections=${(body.match(/<section/g) || []).length}`,
);
