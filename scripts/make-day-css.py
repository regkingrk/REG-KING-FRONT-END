"""
Builds app/day.css, the site's day (light) mode, from app/globals.css.

Run it after changing globals.css:  python3 scripts/make-day-css.py

How it works: every rule that paints a dark background, light text or a light outline gets a twin
rule under html[data-theme="day"] with the colours swapped for their day equivalents. Plates, photos,
films, the 3D preview and REG KING's black-and-yellow buttons are left exactly as they are.
"""
import re, sys, colorsys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = (ROOT / "app/globals.css").read_text()

# --- things day mode never touches -------------------------------------------------------------
SKIP = re.compile(
    r"plate|rk-pp\b|rk-pp[_-]|p3d|rk-badge|ptext|pborder|pbottom|rk-pmark|rk-pbs|rk-gl|intro|film|video|"
    r"rk-hero|hero__|rk-search|rk-modes|rk-mode\b|selltask|shine|scrim|lightbox|rk-media|__media|photo|"
    r"rk-header|rk-bar|site-header|rk-nav|rk-mega|rk-menu|mt__|rk-hicon|rk-replay|vp-scrim|"
    r"rk-plate|reg\b|__reg|rk-fslide|rk-pack|rk-pair|rk-lot__plate|mini-plate|style__plate|made__plate|"
    r"card__plate|rk-pview__stage|pv-stage|surround|acc-prev|rk-acc3d|logo3d|::selection|"
    r"rk-proof|tr-why|vp\b|vp__top|rk-seen|rk-gauge|cd-|rk-footer|ab-next__sign|"
    r"aria-pressed|aria-checked|aria-selected|aria-current|data-lit|data-picked|is-active|is-on|:checked",
    re.I,
)
BUTTONISH = re.compile(r"btn|button|__go\b|__go[^a-z]|-go\b|cta|__n\b|steps__n|__tag|tag\b|chip|pill\b|tick|crest|kbd|rk-way__icon|__icon", re.I)

def parse_color(v):
    v = v.strip().lower()
    names = {"#fff": "#ffffff", "#000": "#000000", "white": "#ffffff", "black": "#000000"}
    v = names.get(v, v)
    m = re.fullmatch(r"#([0-9a-f]{3})", v)
    if m:
        v = "#" + "".join(c * 2 for c in m.group(1))
    m = re.fullmatch(r"#([0-9a-f]{6})", v)
    if m:
        h = m.group(1)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    m = re.fullmatch(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)", v)
    if m:
        return (float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4) or 1))
    return None

def lum(c):
    r, g, b, _ = c
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

def is_yellowish(c):
    r, g, b, _ = c
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    return s > 0.5 and 0.09 < h < 0.2 and l > 0.3

TOKEN = re.compile(r"var\(--[a-z0-9-]+(?:,[^)]*)?\)|#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b")
VARS = {"var(--rk-black)": "#000000", "var(--rk-ink)": "#161514", "var(--rk-white)": "#ffffff", "var(--rk-paper)": "#ffffff"}

def sat(c):
    r, g, b, _ = c
    return colorsys.rgb_to_hls(r / 255, g / 255, b / 255)[2]

def day_bg(c):
    """Dark surfaces become light ones, keeping their order (the darkest become the page, lighter ones raised panels)."""
    r, g, b, a = c
    L = lum(c)
    if is_yellowish(c) or sat(c) > 0.25:
        return None
    if a < 1 and L > 0.85:  # white wash on dark: becomes a dark wash on light
        return f"rgba(22, 21, 20, {min(0.9, a * 0.9):.3f})"
    if L > 0.35:
        return None
    if a < 1:
        return f"rgba(247, 246, 242, {a:.3f})"
    if L < 0.06:
        return "#f7f6f2"
    if L < 0.1:
        return "#ffffff"
    if L < 0.2:
        return "#efede7"
    return "#e4e1d8"

def day_fg(c):
    r, g, b, a = c
    if sat(c) > 0.3 and not is_yellowish(c):
        return None
    if is_yellowish(c):
        return "#8a6a00" if lum(c) > 0.55 else None  # yellow text on dark becomes a deep gold on light
    if lum(c) < 0.6:
        return None
    return f"rgba(22, 21, 20, {a:.3f})" if a < 1 else "#161514"

def day_line(c):
    r, g, b, a = c
    if lum(c) > 0.8 and a < 1 and sat(c) < 0.3:
        return f"rgba(22, 21, 20, {min(1, a * 1.1):.3f})"
    return None

def swap(value, fn):
    changed = False
    def rep(m):
        nonlocal changed
        t = m.group(0)
        if t.startswith("var("):
            if t not in VARS:
                return t
            t = VARS[t]
        c = parse_color(t)
        if not c:
            return m.group(0)
        out = fn(c)
        if out is None:
            return m.group(0)
        changed = True
        return out
    nv = TOKEN.sub(rep, value)
    return nv if changed else None

def parse(css):
    """Yields (at_rules_stack, selector, body) for every style rule."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out, stack, i, n = [], [], 0, len(css)
    buf = ""
    while i < n:
        ch = css[i]
        if ch == "{":
            head = buf.strip()
            buf = ""
            if head.startswith("@") and not head.startswith("@font-face") and not head.startswith("@keyframes") and not head.startswith("@property"):
                stack.append(head)
                i += 1
                continue
            # find matching close for a plain rule (or a block we skip whole)
            depth, j = 1, i + 1
            while j < n and depth:
                if css[j] == "{":
                    depth += 1
                elif css[j] == "}":
                    depth -= 1
                j += 1
            body = css[i + 1 : j - 1]
            if not head.startswith("@"):
                out.append((tuple(stack), head, body))
            i = j
            continue
        if ch == "}":
            if stack:
                stack.pop()
            buf = ""
            i += 1
            continue
        buf += ch
        i += 1
    return out

rules = parse(SRC)

CLASS = re.compile(r"\.([a-zA-Z][\w-]*)")
def blk(cls):
    return re.split(r"__|--", cls)[0]

def props_of(body):
    out = {}
    for d in body.split(";"):
        if ":" in d:
            k, v = d.split(":", 1)
            out[k.strip().lower()] = v.strip()
    return out

# Pass 1: the dark parts of the site (sections and panels painted near-black). Day mode only changes
# rules that belong to one of these, so black buttons and chips on light pages are left alone.
dark_blocks = set()
for stack, sel, body in rules:
    pr = props_of(body)
    bgv = pr.get("background", pr.get("background-color", ""))
    for t in TOKEN.findall(bgv):
        c = parse_color(VARS.get(t, t))
        if c and c[3] == 1:
            if lum(c) < 0.07 and sat(c) < 0.25:
                for one in sel.split(","):
                    one = one.strip()
                    if SKIP.search(one) or BUTTONISH.search(one):
                        continue
                    cl = CLASS.findall(one)
                    if cl:
                        dark_blocks.add(blk(cl[-1]))
            break
dark_blocks.discard("")

def in_dark(sel):
    return any(blk(c) in dark_blocks for c in CLASS.findall(sel))

emitted = []
for stack, sel, body in rules:
    if any("prefers-color-scheme" in s for s in stack):
        continue
    decls = [d.strip() for d in body.split(";") if ":" in d]
    props = {}
    for d in decls:
        k, v = d.split(":", 1)
        props[k.strip().lower()] = v.strip()
    sels = [s.strip() for s in sel.split(",") if s.strip()]
    keep = [s for s in sels if not SKIP.search(s) and not s.startswith(":root") and not s.startswith("html") and "@" not in s and in_dark(s)]
    if not keep:
        continue
    buttonish = all(BUTTONISH.search(s) for s in keep)
    bgv = props.get("background", props.get("background-color", ""))
    bgc = None
    for t in TOKEN.findall(bgv):
        c = parse_color(VARS.get(t, t))
        if c and c[3] == 1:
            bgc = c
            break
    fgc = parse_color(VARS.get(props.get("color", ""), props.get("color", ""))) if props.get("color") else None
    # black buttons and chips (dark with yellow or white writing) stay as they are
    if buttonish and bgc and lum(bgc) < 0.2:
        continue
    if bgc and lum(bgc) < 0.2 and fgc and is_yellowish(fgc):
        continue
    # coloured panels (green, red, blue...) keep their own colours and writing
    if bgc and sat(bgc) > 0.25 and not is_yellowish(bgc):
        continue
    out = []
    for k, v in props.items():
        if "!important" in v and k not in ("background", "background-color", "color"):
            continue
        if k in ("background", "background-color", "background-image"):
            if "url(" in v:
                continue
            nv = swap(v, day_bg)
        elif k in ("color", "fill", "caret-color", "-webkit-text-fill-color"):
            nv = swap(v, day_fg)
        elif k.startswith("border") or k in ("outline", "outline-color", "text-decoration-color", "column-rule", "stroke") or k == "box-shadow" and "inset" in v:
            nv = swap(v, day_line)
        else:
            nv = None
        if nv:
            out.append(f"  {k}: {nv};")
    if not out:
        continue
    wrapped = ",\n".join(f'html[data-theme="day"] {s}' for s in keep)
    block = f"{wrapped} {{\n" + "\n".join(out) + "\n}"
    for at in reversed(stack):
        block = f"{at} {{\n{block}\n}}"
    emitted.append(block)

head = """/*
 * Day mode. GENERATED by scripts/make-day-css.py from globals.css: don't edit by hand, change
 * globals.css (or day-extra.css for hand-made day tweaks) and run the script again.
 */
"""
extra = ROOT / "app/day-extra.css"
tail = "\n\n" + extra.read_text() if extra.exists() else ""
(ROOT / "app/day.css").write_text(head + "\n\n".join(emitted) + tail + "\n")
print(len(emitted), "rules;", len(dark_blocks), "dark parts:", " ".join(sorted(dark_blocks)))
