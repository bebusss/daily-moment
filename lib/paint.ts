// The window, painted once on canvases (no image files), the way a glass painter works:
// each piece is cut from its own sheet of glass (streaky cathedral, seedy clear, milky
// opal or a jewel), shaded with grisaille (dark paint fired onto the glass: veins,
// stippling, a soft matting toward the leads), and leaded.
//
// paintWindow() gives four canvases, all the same size, all in the window's own frame:
// - glass: how much light each spot lets through, and in what color (paint included);
// - lead:  where the lead cames are (a rounded profile, brightest along their middle);
// - mask:  red = gold (mended) lead, as its height; green = tonight's glow; blue = how milky the glass is;
// - ids:   which piece each pixel belongs to (for picking, and for tonight's glow).
// repaintWindow() redoes only the pieces that changed (tonight's leaf when it's set, a missed
// night when it's mended), reusing the rest. paintOutside() paints the evening the window looks
// out on; paintStone() the wall.

import { seeded, type Pt } from "@/lib/geometry";
import { leafHalf, leafMid } from "@/lib/vine";
import type { GlassType, PaneModel, WindowModel } from "@/lib/window-model";

/** Pixels per scene unit on the window's canvases. */
export const PX = 330;

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

/**
 * A canvas's 2D context. `readable` keeps it in memory instead of on the graphics card: reading
 * pixels back from a card-held canvas makes the browser finish all its pending drawing first.
 * (The first call decides; later calls get the same context.)
 */
const ctx = (c: HTMLCanvasElement, readable = false) => c.getContext("2d", { willReadFrequently: readable })!;

type Rand = () => number;

// ---------------------------------------------------------------------------------------------
// Sheets of glass: how each kind of glass varies as light comes through it (grey, multiplied
// over the piece's color). Drawn so they tile, and cached: every piece cuts from the same sheets.

const TILE = 512;
const sheets = new Map<GlassType, HTMLCanvasElement>();

/** Draws `draw` at (x, y) and wherever it would wrap across the tile's edges. */
function wrapped(x: number, y: number, r: number, draw: (x: number, y: number) => void) {
  for (const dx of [-TILE, 0, TILE])
    for (const dy of [-TILE, 0, TILE]) if (x + dx > -r && x + dx < TILE + r && y + dy > -r && y + dy < TILE + r) draw(x + dx, y + dy);
}

function blobs(g: CanvasRenderingContext2D, rand: Rand, n: number, rMin: number, rMax: number, light: string, dark: string) {
  for (let i = 0; i < n; i++) {
    const r = rMin + rand() * (rMax - rMin);
    const color = rand() > 0.5 ? light : dark;
    wrapped(rand() * TILE, rand() * TILE, r, (x, y) => {
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    });
  }
}

/** Long wavy streaks running down the sheet, like glass rolled out while hot. */
function streaks(g: CanvasRenderingContext2D, rand: Rand, n: number, alpha: number) {
  for (let i = 0; i < n; i++) {
    const x0 = rand() * TILE;
    const amp = 2 + rand() * 12;
    const cycles = 1 + Math.floor(rand() * 3);
    const phase = rand() * Math.PI * 2;
    const light = rand() > 0.45;
    g.strokeStyle = light ? `rgba(255,255,255,${alpha * (0.4 + rand())})` : `rgba(110,110,110,${alpha * (0.3 + rand() * 0.8)})`;
    g.lineWidth = 1 + rand() * 6;
    for (const dx of [-TILE, 0, TILE]) {
      g.beginPath();
      for (let y = 0; y <= TILE; y += 8) {
        const x = x0 + dx + Math.sin((y / TILE) * Math.PI * 2 * cycles + phase) * amp;
        if (y === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
    }
  }
}

/** Tiny air bubbles caught in the glass ("seeds"): a dark rim and a bright point. */
function seeds(g: CanvasRenderingContext2D, rand: Rand, n: number, rMax: number, strength: number) {
  for (let i = 0; i < n; i++) {
    const r = 0.6 + rand() * rMax;
    const stretch = 1 + rand() * 1.6;
    wrapped(rand() * TILE, rand() * TILE, r * 3, (x, y) => {
      g.strokeStyle = `rgba(70,70,70,${0.5 * strength})`;
      g.lineWidth = Math.max(0.6, r * 0.45);
      g.beginPath();
      g.ellipse(x, y, r, r * stretch, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = `rgba(255,255,255,${0.9 * strength})`;
      g.beginPath();
      g.arc(x - r * 0.25, y - r * 0.3, Math.max(0.5, r * 0.35), 0, Math.PI * 2);
      g.fill();
    });
  }
}

function sheet(kind: GlassType): HTMLCanvasElement {
  const cached = sheets.get(kind);
  if (cached) return cached;
  const c = canvas(TILE, TILE);
  const g = ctx(c);
  const rand = seeded("sheet:" + kind);
  if (kind === "cathedral") {
    g.fillStyle = "rgb(232,232,232)";
    g.fillRect(0, 0, TILE, TILE);
    blobs(g, rand, 46, 30, 150, "rgba(255,255,255,0.32)", "rgba(150,150,150,0.24)");
    streaks(g, rand, 170, 0.11);
    seeds(g, rand, 45, 1.6, 0.6);
  } else if (kind === "seedy") {
    g.fillStyle = "rgb(246,246,246)";
    g.fillRect(0, 0, TILE, TILE);
    streaks(g, rand, 40, 0.06);
    seeds(g, rand, 260, 2.6, 1);
  } else if (kind === "opal") {
    g.fillStyle = "rgb(226,226,226)";
    g.fillRect(0, 0, TILE, TILE);
    blobs(g, rand, 90, 25, 130, "rgba(255,255,255,0.34)", "rgba(165,165,165,0.26)");
    blobs(g, rand, 30, 8, 30, "rgba(255,255,255,0.4)", "rgba(180,180,180,0.25)");
  } else {
    g.fillStyle = "rgb(238,238,238)";
    g.fillRect(0, 0, TILE, TILE);
    blobs(g, rand, 30, 20, 90, "rgba(255,255,255,0.3)", "rgba(140,140,140,0.22)");
    seeds(g, rand, 30, 1.2, 0.5);
  }
  sheets.set(kind, c);
  return c;
}

// ---------------------------------------------------------------------------------------------
// The window.

export type PaintedWindow = {
  glass: HTMLCanvasElement;
  lead: HTMLCanvasElement;
  mask: HTMLCanvasElement;
  ids: HTMLCanvasElement;
  /** The pane at a spot on the window (u, v in 0..1, v up), if any. */
  paneAt: (u: number, v: number) => PaneModel | undefined;
  /** What it was painted from, and the mask's three layers, for repainting a piece later. */
  model: WindowModel;
  layers: { gold: HTMLCanvasElement; milk: HTMLCanvasElement; glow: HTMLCanvasElement };
  idPx: Uint8ClampedArray;
};

/** Lead widths, in scene units. */
const LEAD = { outline: 0.042, border: 0.026, jewel: 0.018, star: 0.016, night: 0.025, other: 0.02 };
const leadWidth = (p: PaneModel) =>
  p.kind === "border" || p.kind === "fillet" ? LEAD.border : p.kind === "jewel" ? LEAD.jewel : p.kind === "star" ? LEAD.star : p.kind === "night" ? LEAD.night : LEAD.other;

export function paintWindow(model: WindowModel): PaintedWindow {
  const w = Math.round(model.width * PX);
  const h = Math.round(model.height * PX);
  const px = ([x, y]: Pt): Pt => [(x + model.width / 2) * PX, (model.height / 2 - y) * PX];
  const path = (pts: Pt[]) => {
    const p = new Path2D();
    pts.forEach((pt, i) => (i ? p.lineTo(...px(pt)) : p.moveTo(...px(pt))));
    p.closePath();
    return p;
  };
  const glass = canvas(w, h);
  const g = ctx(glass);
  const lead = canvas(w, h);
  const l = ctx(lead);
  const gold = canvas(w, h);
  const au = ctx(gold, true);
  const milk = canvas(w, h);
  const m = ctx(milk, true);
  const ids = canvas(w, h);
  const id = ctx(ids, true);
  const glowCanvas = canvas(w, h);
  const ri = ctx(glowCanvas, true);
  for (const c of [g, l, au, m, id, ri]) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    c.lineJoin = "round";
    c.lineCap = "round";
  }

  model.panes.forEach((pane, index) => {
    const shape = path(pane.points);
    paintGlass(g, pane, shape, px);

    // Its lead, and where it is: what's painted later covers what's behind it.
    const lw = leadWidth(pane) * PX;
    l.globalCompositeOperation = "source-over";
    l.fillStyle = "#000";
    l.fill(shape);
    l.globalCompositeOperation = "lighter";
    for (const [k, a] of [
      [1, 0.4],
      [0.66, 0.35],
      [0.33, 0.5],
    ] as const) {
      l.strokeStyle = `rgba(255,255,255,${a})`;
      l.lineWidth = lw * k;
      l.stroke(shape);
    }
    // Solder where the leads meet: on the corners of the cut pieces.
    if (pane.kind === "ground" || pane.kind === "sky" || pane.kind === "border" || pane.kind === "fillet") {
      for (const pt of [pane.points[0], ...(pane.points.length <= 12 ? pane.points.slice(1) : [pane.points[pane.points.length - 1]])]) {
        const [x, y] = px(pt);
        l.fillStyle = "rgba(255,255,255,0.35)";
        l.beginPath();
        l.arc(x, y, lw * 0.85, 0, Math.PI * 2);
        l.fill();
      }
    }

    au.fillStyle = "#000";
    au.fill(shape);
    paintMilk(m, pane, shape);
    id.fillStyle = `rgb(${(index + 1) & 255},${(index + 1) >> 8},255)`;
    id.fill(shape);
  });

  for (const pane of model.panes) {
    if (pane.mended) paintGold(au, pane, path(pane.points));
    if (pane.status === "today") paintWaiting(ri, path(pane.points));
    else if (pane.next) paintWaiting(ri, path(pane.points), 0.4);
  }

  // The outer lead, heavier, all the way round.
  const rim = path(model.outline);
  g.strokeStyle = "#140e0a";
  g.lineWidth = LEAD.outline * PX;
  g.stroke(rim);
  l.globalCompositeOperation = "lighter";
  for (const [k, a] of [
    [1, 0.45],
    [0.6, 0.4],
    [0.3, 0.5],
  ] as const) {
    l.strokeStyle = `rgba(255,255,255,${a})`;
    l.lineWidth = LEAD.outline * PX * k;
    l.stroke(rim);
  }

  const mask = canvas(w, h);
  const layers = { gold, milk, glow: glowCanvas };
  composeMask(mask, layers, { x: 0, y: 0, w, h });
  const idPx = id.getImageData(0, 0, w, h).data;
  return { glass, lead, mask, ids, paneAt: picker(model, idPx, w, h), model, layers, idPx };
}

/**
 * The same window after some nights changed (tonight's leaf set, a missed night mended): only
 * those pieces are painted again; the lead and the piece map are reused as they are.
 * Returns null when the geometry differs (another month), so the caller paints from scratch.
 */
export function repaintWindow(before: PaintedWindow, model: WindowModel): PaintedWindow | null {
  const was = before.model;
  if (was.outline !== model.outline || was.panes.length !== model.panes.length) return null;
  // A piece that changed shape (tonight's moon arriving) changes the lead and the piece map too.
  if (model.panes.some((p, i) => p.points !== was.panes[i].points)) return null;
  const changed = model.panes.filter((p, i) => {
    const q = was.panes[i];
    return q.color !== p.color || q.status !== p.status || q.mended !== p.mended || q.next !== p.next || q.diffusion !== p.diffusion || q.glass !== p.glass;
  });
  if (!changed.length) return { ...before, model, paneAt: picker(model, before.idPx, before.glass.width, before.glass.height) };

  const { glass: w0 } = before;
  const [w, h] = [w0.width, w0.height];
  const px = ([x, y]: Pt): Pt => [(x + model.width / 2) * PX, (model.height / 2 - y) * PX];
  const path = (pts: Pt[]) => {
    const p = new Path2D();
    pts.forEach((pt, i) => (i ? p.lineTo(...px(pt)) : p.moveTo(...px(pt))));
    p.closePath();
    return p;
  };
  const copy = (c: HTMLCanvasElement, readable = false) => {
    const out = canvas(w, h);
    ctx(out, readable).drawImage(c, 0, 0);
    return out;
  };
  const glass = copy(before.glass);
  const layers = { gold: copy(before.layers.gold, true), milk: copy(before.layers.milk, true), glow: copy(before.layers.glow, true) };
  const [g, au, m, ri] = [ctx(glass), ctx(layers.gold), ctx(layers.milk), ctx(layers.glow)];
  for (const c of [g, au, m, ri]) {
    c.lineJoin = "round";
    c.lineCap = "round";
  }

  const pad = LEAD.outline * PX * 2;
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const pane of changed) {
    const shape = path(pane.points);
    paintGlass(g, pane, shape, px);
    paintMilk(m, pane, shape);
    ri.save();
    ri.clip(shape);
    ri.fillStyle = "#000";
    ri.fillRect(0, 0, w, h);
    ri.restore();
    if (pane.status === "today") paintWaiting(ri, shape);
    else if (pane.next) paintWaiting(ri, shape, 0.4);
    if (pane.mended) paintGold(au, pane, shape);
    for (const p of pane.points) {
      const [x, y] = px(p);
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  }
  const area = { x: Math.max(0, Math.floor(x0 - pad)), y: Math.max(0, Math.floor(y0 - pad)), w: 0, h: 0 };
  area.w = Math.min(w, Math.ceil(x1 + pad)) - area.x;
  area.h = Math.min(h, Math.ceil(y1 + pad)) - area.y;
  const mask = copy(before.mask);
  composeMask(mask, layers, area);
  return { glass, lead: before.lead, mask, ids: before.ids, paneAt: picker(model, before.idPx, w, h), model, layers, idPx: before.idPx };
}

/** The pane at a spot on the window, read from the piece map. */
function picker(model: WindowModel, idPx: Uint8ClampedArray, w: number, h: number) {
  return (u: number, v: number) => {
    const x = Math.min(w - 1, Math.max(0, Math.floor(u * w)));
    const y = Math.min(h - 1, Math.max(0, Math.floor((1 - v) * h)));
    const k = (y * w + x) * 4;
    if (idPx[k + 2] < 128) return undefined;
    return model.panes[idPx[k] + idPx[k + 1] * 256 - 1];
  };
}

/** One piece of glass: its color, its sheet's texture cut along its own grain, its paint, its lead. */
function paintGlass(g: CanvasRenderingContext2D, pane: PaneModel, shape: Path2D, px: (p: Pt) => Pt) {
  const xs = pane.points.map((p) => px(p)[0]);
  const ys = pane.points.map((p) => px(p)[1]);
  const box = { x: Math.min(...xs) - 4, y: Math.min(...ys) - 4, w: Math.max(...xs) - Math.min(...xs) + 8, h: Math.max(...ys) - Math.min(...ys) + 8 };
  g.save();
  g.clip(shape);
  g.fillStyle = pane.color;
  g.fillRect(box.x, box.y, box.w, box.h);
  g.globalCompositeOperation = "multiply";
  const pattern = g.createPattern(sheet(pane.glass), "repeat")!;
  const [cx, cy] = [box.x + box.w / 2, box.y + box.h / 2];
  pattern.setTransform(
    new DOMMatrix()
      .translateSelf(cx, cy)
      .rotateSelf(((-pane.grain + Math.PI / 2) * 180) / Math.PI)
      .translateSelf(pane.tone * TILE, ((pane.tone * 7.3) % 1) * TILE)
      .scaleSelf(pane.glass === "seedy" ? 0.8 : 1.15),
  );
  g.fillStyle = pattern;
  g.fillRect(box.x - box.w, box.y - box.h, box.w * 3, box.h * 3);
  // Each piece's paint has its own seed, so it looks the same however the window is painted.
  paintGrisaille(g, pane, shape, px, seeded("paint:" + pane.key));
  g.restore();
  g.strokeStyle = "#17110c";
  g.lineWidth = leadWidth(pane) * PX;
  g.stroke(shape);
}

/** How milky the piece is (blue channel of the mask). */
function paintMilk(m: CanvasRenderingContext2D, pane: PaneModel, shape: Path2D) {
  const v = Math.round(pane.diffusion * 255);
  m.fillStyle = `rgb(${v},${v},${v})`;
  m.fill(shape);
  m.lineWidth = leadWidth(pane) * PX;
  m.strokeStyle = m.fillStyle;
  m.stroke(shape);
}

/**
 * A mended night: its whole lead, gold (red channel of the mask). Drawn as a came of its own, a
 * little wider than lead and half-round: the value is its height, highest along its crown, so the
 * glass shader can light it as metal. Each step keeps the higher of the two values, so painting
 * it twice, or two mended pieces sharing an edge, gives the same came.
 */
function paintGold(au: CanvasRenderingContext2D, pane: PaneModel, shape: Path2D) {
  const width = leadWidth(pane) * PX * 1.8;
  const steps = 12;
  au.globalCompositeOperation = "lighten";
  for (let k = 0; k < steps; k++) {
    const x = 1 - (k + 0.5) / steps; // how far out from the crown, as a share of the half-width
    const v = Math.round(Math.sqrt(1 - x * x) * 255);
    au.strokeStyle = `rgb(${v},${v},${v})`;
    au.lineWidth = width * (1 - k / steps);
    au.stroke(shape);
  }
  au.globalCompositeOperation = "source-over";
}

/** Tonight's leaf: a glow just inside its lead, for the light that waits in it (green channel). Tomorrow's, fainter. */
function paintWaiting(ri: CanvasRenderingContext2D, shape: Path2D, strength = 1) {
  ri.save();
  ri.clip(shape);
  ri.globalCompositeOperation = "lighter";
  ri.globalAlpha = strength;
  for (const [k, a] of [
    [0.16, 0.22],
    [0.09, 0.3],
    [0.045, 0.45],
  ] as const) {
    ri.strokeStyle = `rgba(255,255,255,${a})`;
    ri.lineWidth = k * PX;
    ri.stroke(shape);
  }
  ri.fillStyle = "rgba(255,255,255,0.3)";
  ri.fill(shape);
  ri.restore();
}

/** Gold in red, tonight's glow in green, milkiness in blue: packed into the mask, in `area` only. */
function composeMask(mask: HTMLCanvasElement, layers: PaintedWindow["layers"], area: { x: number; y: number; w: number; h: number }) {
  if (area.w <= 0 || area.h <= 0) return;
  const read = (c: HTMLCanvasElement) => ctx(c, true).getImageData(area.x, area.y, area.w, area.h).data;
  const [goldPx, glowPx, milkPx] = [read(layers.gold), read(layers.glow), read(layers.milk)];
  const mk = ctx(mask);
  const out = mk.createImageData(area.w, area.h);
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = goldPx[i];
    out.data[i + 1] = glowPx[i];
    out.data[i + 2] = milkPx[i];
    out.data[i + 3] = 255;
  }
  mk.putImageData(out, area.x, area.y);
}

/** Grisaille: the dark paint fired onto the glass. Called with the piece's shape as the clip. */
function paintGrisaille(g: CanvasRenderingContext2D, pane: PaneModel, shape: Path2D, px: (p: Pt) => Pt, rand: Rand) {
  const U = PX;
  // Matting: a soft wash of paint that gathers toward the leads, so every piece glows from its middle.
  const matte = pane.kind === "sky" ? 0.34 : pane.kind === "border" ? 0.3 : pane.glass === "seedy" ? 0.12 : 0.24;
  g.globalCompositeOperation = "multiply";
  for (const [k, a] of [
    [0.12, 0.35],
    [0.06, 0.45],
    [0.028, 0.6],
  ] as const) {
    g.strokeStyle = `rgba(70,46,28,${matte * a})`;
    g.lineWidth = k * U;
    g.stroke(shape);
  }

  if (pane.leaf) {
    const f = pane.leaf;
    const s = pane.status === "done" ? 1 : pane.status === "gap" ? 0.6 : pane.status === "today" ? 0.5 : 0.5;
    const d: Pt = [Math.cos(f.angle), Math.sin(f.angle)];
    const n: Pt = [-d[1], d[0]];
    const at = (u: number, off = 0): Pt => {
      const p = leafMid(f, u);
      return px([p[0] + n[0] * off, p[1] + n[1] * off]);
    };
    // Shade one half of the leaf, as if it were turned a little away from the light.
    const [ax, ay] = at(0.5, f.width / 2);
    const [bx, by] = at(0.5, -f.width / 2);
    const shade = g.createLinearGradient(ax, ay, bx, by);
    shade.addColorStop(0, "rgba(60,38,20,0)");
    shade.addColorStop(0.55, "rgba(60,38,20,0)");
    shade.addColorStop(1, `rgba(60,38,20,${0.3 * s})`);
    g.fillStyle = shade;
    g.fill(shape);
    // Stippling: paint dabbed on with a badger brush.
    for (let i = 0; i < 60 * s; i++) {
      const u = rand();
      const off = (rand() * 2 - 1) * leafHalf(f, u) * 0.95;
      const [x, y] = at(u, off);
      g.fillStyle = `rgba(55,35,18,${0.16 * s})`;
      g.beginPath();
      g.arc(x, y, 0.8 + rand() * 2.2, 0, Math.PI * 2);
      g.fill();
    }
    // The midrib.
    const rib = (width: number, alpha: number, off = 0) => {
      g.strokeStyle = `rgba(40,24,12,${alpha * s})`;
      g.lineWidth = width * U;
      g.beginPath();
      for (let k = 0; k <= 20; k++) {
        const [x, y] = at(0.02 + (0.88 * k) / 20, off);
        if (k) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.stroke();
    };
    rib(0.016, 0.35);
    rib(0.007, 0.6);
    // Side veins, curving out toward the edge.
    const veins = 5 + Math.floor(pane.tone * 3);
    for (let k = 1; k <= veins; k++) {
      const u = 0.1 + (0.72 * k) / (veins + 0.5);
      for (const side of [1, -1]) {
        const reach = u + 0.14;
        const [x0, y0] = at(u);
        const [cx, cy] = at(u + 0.07, side * leafHalf(f, u + 0.07) * 0.45);
        const [x1, y1] = at(reach, side * leafHalf(f, reach) * 0.86);
        g.strokeStyle = `rgba(42,26,12,${0.42 * s})`;
        g.lineWidth = 0.0055 * U;
        g.beginPath();
        g.moveTo(x0, y0);
        g.quadraticCurveTo(cx, cy, x1, y1);
        g.stroke();
      }
    }
    // A highlight scraped out of the paint beside the midrib.
    g.globalCompositeOperation = "screen";
    g.strokeStyle = `rgba(255,248,230,${0.22 * s})`;
    g.lineWidth = 0.007 * U;
    g.beginPath();
    for (let k = 0; k <= 16; k++) {
      const [x, y] = at(0.08 + (0.7 * k) / 16, 0.016);
      if (k) g.lineTo(x, y);
      else g.moveTo(x, y);
    }
    g.stroke();
    g.globalCompositeOperation = "multiply";
    return;
  }

  const xs = pane.points.map((p) => px(p)[0]);
  const ys = pane.points.map((p) => px(p)[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const within = (): Pt => [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];

  if (pane.kind === "sky") {
    // A night sky stippled dark, with a few specks of light left in the paint.
    for (let i = 0; i < ((x1 - x0) * (y1 - y0)) / 90; i++) {
      const [x, y] = within();
      g.fillStyle = `rgba(10,10,30,${0.1 + rand() * 0.18})`;
      g.beginPath();
      g.arc(x, y, 0.6 + rand() * 1.8, 0, Math.PI * 2);
      g.fill();
    }
  } else if (pane.kind === "moon") {
    for (let i = 0; i < 7; i++) {
      const [x, y] = within();
      const r = (0.02 + rand() * 0.05) * U;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(150,110,50,0.28)");
      grad.addColorStop(1, "rgba(150,110,50,0)");
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  } else if (pane.kind === "jewel" || pane.kind === "star") {
    // A cabochon: brighter toward the top left, darker at the rim.
    const r = ((x1 - x0) / 2) * 1.1;
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
    g.globalCompositeOperation = "screen";
    const hi = g.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 0, cx - r * 0.3, cy - r * 0.35, r);
    hi.addColorStop(0, "rgba(255,255,255,0.6)");
    hi.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = hi;
    g.fillRect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
    g.globalCompositeOperation = "multiply";
  } else if (pane.kind === "stem") {
    // A shaded line down one side of the stem.
    g.strokeStyle = "rgba(40,30,10,0.35)";
    g.lineWidth = 0.012 * U;
    g.beginPath();
    const half = Math.floor(pane.points.length / 2);
    pane.points.slice(0, half).forEach((pt, i) => {
      const [x, y] = px(pt);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  } else if (pane.kind === "border") {
    // Pearls scraped out of a dark band, the old way of finishing a border.
    g.fillStyle = "rgba(40,20,10,0.25)";
    g.fill(shape);
    g.globalCompositeOperation = "screen";
    const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
    g.fillStyle = "rgba(255,240,215,0.32)";
    g.beginPath();
    g.arc(cx, cy, 0.022 * U, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = "multiply";
  }
}

// ---------------------------------------------------------------------------------------------
// Outside: a late afternoon, low sun to the upper right, trees and a roof below. Painted at a
// low resolution: through the glass it's mostly light and soft shapes.

const OUT = 110;

export function paintOutside(model: WindowModel): { sharp: HTMLCanvasElement; soft: HTMLCanvasElement; sun: [number, number] } {
  const w = Math.round(model.width * OUT);
  const h = Math.round(model.height * OUT);
  const c = canvas(w, h);
  const g = ctx(c);
  const rand = seeded("outside");
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#9fb2c9");
  sky.addColorStop(0.22, "#ecdcc0");
  sky.addColorStop(0.5, "#f9dfb6");
  sky.addColorStop(0.75, "#f5c68c");
  sky.addColorStop(1, "#d98d5a");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // A few long clouds catching the light.
  g.filter = "blur(6px)";
  for (let i = 0; i < 6; i++) {
    g.fillStyle = `rgba(255,${200 + rand() * 40},${150 + rand() * 50},${0.25 + rand() * 0.2})`;
    g.beginPath();
    g.ellipse(rand() * w, h * (0.12 + rand() * 0.3), w * (0.25 + rand() * 0.3), h * 0.012 + rand() * h * 0.01, (rand() - 0.5) * 0.1, 0, Math.PI * 2);
    g.fill();
  }
  // Trees: a big one on the left, a line of them far off, a roof on the right.
  g.filter = "blur(1.5px)";
  const tree = (x: number, y: number, r: number, color: string) => {
    for (let i = 0; i < 26; i++) {
      g.fillStyle = color;
      g.beginPath();
      g.arc(x + (rand() - 0.5) * r * 1.6, y + (rand() - 0.5) * r * 1.4, r * (0.25 + rand() * 0.35), 0, Math.PI * 2);
      g.fill();
    }
  };
  for (let i = 0; i < 9; i++) tree(w * (i / 8), h * (0.86 + rand() * 0.04), w * 0.12, "rgba(110,72,48,0.85)");
  tree(w * 0.1, h * 0.62, w * 0.34, "rgba(62,44,30,0.95)");
  tree(w * 0.02, h * 0.82, w * 0.3, "rgba(55,38,26,0.95)");
  g.fillStyle = "rgba(60,42,32,0.95)";
  g.beginPath();
  g.moveTo(w * 0.55, h);
  g.lineTo(w * 0.62, h * 0.86);
  g.lineTo(w * 0.86, h * 0.83);
  g.lineTo(w * 1.02, h * 0.9);
  g.lineTo(w * 1.02, h);
  g.fill();
  g.fillRect(w * 0.7, h * 0.79, w * 0.05, h * 0.05);
  // Branches reaching up from the big tree.
  g.filter = "none";
  g.strokeStyle = "rgba(55,38,26,0.9)";
  for (let i = 0; i < 10; i++) {
    let [x, y] = [w * (0.05 + rand() * 0.25), h * (0.5 + rand() * 0.1)];
    g.lineWidth = 1 + rand() * 2;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) {
      x += (rand() - 0.3) * w * 0.05;
      y -= rand() * h * 0.03;
      g.lineTo(x, y);
    }
    g.stroke();
  }

  // Through milky glass the trees are only a faint shading in the light.
  const soft = canvas(w, h);
  const s = ctx(soft);
  s.fillStyle = sky;
  s.fillRect(0, 0, w, h);
  s.filter = "blur(14px)";
  s.globalAlpha = 0.45;
  s.drawImage(c, 0, 0);
  // Where the sun sits behind the window, in the window's u, v (v up).
  return { sharp: c, soft, sun: [0.74, 0.66] };
}

// ---------------------------------------------------------------------------------------------
// The wall: dressed limestone in courses, a little weathered. A color canvas and a height canvas
// (turned into normals here), both tiling, `STONE` scene units square.

export const STONE = 3.2;

export function paintStone(size = 1024): { color: HTMLCanvasElement; normal: HTMLCanvasElement } {
  const per = size / STONE;
  const color = canvas(size, size);
  const g = ctx(color);
  const height = canvas(size, size);
  const hg = ctx(height, true);
  const rand = seeded("stone");
  // Specks: as many per stone whatever the texture's size, from a few ready-made colors.
  const k = size / 1024;
  const lightSpecks = Array.from({ length: 8 }, (_, i) => `rgba(255,245,225,${(0.05 + (0.07 * i) / 7).toFixed(3)})`);
  const darkSpecks = Array.from({ length: 8 }, (_, i) => `rgba(45,32,20,${(0.05 + (0.1 * i) / 7).toFixed(3)})`);
  const pits = Array.from({ length: 8 }, (_, i) => `rgba(0,0,0,${(0.25 + (0.3 * i) / 7).toFixed(3)})`);
  const pick8 = (list: string[]) => list[Math.min(7, Math.floor(rand() * 8))];
  g.fillStyle = "#6f604f";
  g.fillRect(0, 0, size, size);
  hg.fillStyle = "rgb(40,40,40)";
  hg.fillRect(0, 0, size, size);

  // Courses of blocks, the joints staggered.
  const course = 0.4 * per;
  const courses = Math.round(size / course);
  const ch = size / courses;
  for (let r = 0; r < courses; r++) {
    let x = -rand() * 0.6 * per;
    while (x < size) {
      const bw = (0.55 + rand() * 0.6) * per;
      const tone = 0.82 + rand() * 0.25;
      const base = [178 * tone, 160 * tone, 134 * tone].map(Math.round);
      const gap = Math.max(2, 3 * k);
      for (const dx of [0, -size, size]) {
        const bx = x + dx + gap;
        const by = r * ch + gap;
        g.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
        g.fillRect(bx, by, bw - gap * 2, ch - gap * 2);
        // Darker toward the bottom of each block, where dirt settles.
        const grime = g.createLinearGradient(0, by, 0, by + ch);
        grime.addColorStop(0, "rgba(255,240,220,0.06)");
        grime.addColorStop(1, "rgba(40,28,18,0.16)");
        g.fillStyle = grime;
        g.fillRect(bx, by, bw - gap * 2, ch - gap * 2);
        hg.fillStyle = "rgb(205,205,205)";
        hg.fillRect(bx + 2, by + 2, bw - gap * 2 - 4, ch - gap * 2 - 4);
      }
      x += bw;
    }
  }
  // Speckle and pitting.
  for (let i = 0; i < 26000 * k * k; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (0.4 + rand() * 1.8) * Math.max(k, 0.6);
    const v = rand();
    g.fillStyle = v > 0.5 ? pick8(lightSpecks) : pick8(darkSpecks);
    g.fillRect(x, y, r, r);
    if (v < 0.25) {
      hg.fillStyle = pick8(pits);
      hg.beginPath();
      hg.arc(x, y, r * 1.4, 0, Math.PI * 2);
      hg.fill();
    }
  }
  // Soft mottling across the blocks.
  for (let i = 0; i < 60; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (30 + rand() * 120) * k;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const c = rand() > 0.5 ? "255,236,205" : "60,42,26";
    grad.addColorStop(0, `rgba(${c},0.08)`);
    grad.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Height into normals.
  const src = hg.getImageData(0, 0, size, size).data;
  const normal = canvas(size, size);
  const ng = ctx(normal);
  const img = ng.createImageData(size, size);
  const at = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.2;
      const k = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = ((-dx / k) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((dy / k) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / k) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  ng.putImageData(img, 0, 0);
  return { color, normal };
}
