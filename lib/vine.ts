// The design of the month's window, as a glazier would cut it: a tall pointed
// lancet with a jeweled border and a pale fillet; a vine climbing up the middle
// with one leaf per night (night 1 at the bottom, so the month grows upward);
// pale cathedral glass behind it, cut in irregular pieces; and in the head of the
// arch a small night sky with a crescent moon and a few stars.
// Units are scene units, y up, centered on the window.

import {
  add,
  arc,
  clipHalf,
  dir,
  edgeDistance,
  inside,
  len,
  lerp,
  mul,
  overlaps,
  relax,
  seeded,
  sub,
  voronoi,
  type Pt,
} from "@/lib/geometry";

export type PieceKind = "night" | "ground" | "sky" | "stem" | "bud" | "border" | "fillet" | "jewel" | "moon" | "star" | "sun";

/** A leaf's own frame, so the painter can draw its veins: where it starts, which way it points,
 * its size, how much its midrib bends, and its shape (a: where it's widest, b: how full it is). */
export type LeafFrame = { base: Pt; angle: number; length: number; width: number; bend: number; a: number; b: number };

/** A point on a leaf's midrib, `u` from its base (0) to its tip (1). */
export function leafMid(f: LeafFrame, u: number): Pt {
  const d = dir(f.angle);
  const n: Pt = [-d[1], d[0]];
  return add(add(f.base, mul(d, u * f.length)), mul(n, f.bend * Math.sin(Math.PI * u) * f.length));
}

/** A leaf's half-width at `u`. */
export const leafHalf = (f: LeafFrame, u: number) =>
  Math.max(0.012, (f.width / 2) * Math.pow(Math.sin(Math.PI * Math.pow(Math.min(Math.max(u, 0), 1), f.a)), f.b));

export type Piece = {
  key: string;
  kind: PieceKind;
  /** 1-based night of the month (leaves only). */
  day?: number;
  points: Pt[];
  /** 0..1, a stable per-piece number for picking shades and textures. */
  tone: number;
  /** Which way the glass's streaks run, in radians. */
  grain: number;
  leaf?: LeafFrame;
};

export type Design = {
  width: number;
  height: number;
  outline: Pt[];
  pieces: Piece[];
  /** Where the iron saddle bars cross the window (y values). */
  bars: number[];
  /** The moon's disc (its piece is drawn on top of the sky, so its shape can follow the real phase). */
  moon: { c: Pt; r: number };
};

/**
 * The moon as tonight's phase: the lit part of its disc. `lit` is 0 (new) to 1 (full); while it
 * grows the right side is lit. Never less than a sliver, so the window always has its moon.
 */
export function moonShape(c: Pt, r: number, lit: number, waxing: boolean, steps = 48): Pt[] {
  const f = Math.min(0.97, Math.max(0.07, lit));
  // The line between light and dark is half an ellipse: toward the lit side while it's a
  // crescent (under half lit), away from it once it's gibbous.
  const a = r * (1 - 2 * f);
  const side = waxing ? 1 : -1;
  const pts: Pt[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = Math.PI / 2 - (Math.PI * k) / steps;
    pts.push([c[0] + side * r * Math.cos(t), c[1] + r * Math.sin(t)]);
  }
  for (let k = 1; k < steps; k++) {
    const t = -Math.PI / 2 + (Math.PI * k) / steps;
    pts.push([c[0] + side * a * Math.cos(t), c[1] + r * Math.sin(t)]);
  }
  return pts;
}

export const W = 2.4;
export const H = 6.2;
export const BOTTOM = -H / 2;
/** The arch's radius as a share of the width: a little less pointed than equilateral. */
const R = 0.86 * W;
const ARCH = Math.sqrt(R * R - (R - W / 2) ** 2);
export const SPRING = BOTTOM + H - ARCH;
const BORDER = 0.15;
const FILLET = 0.03;

/**
 * The lancet's outline grown inward by `inset`: straight sides, a flat bottom, and two arcs
 * that meet in a point. `s` (0..1) walks around it from the bottom left, counter-clockwise.
 */
export function lancetAt(inset: number, s: number): Pt {
  const hw = W / 2 - inset;
  const bottom = BOTTOM + inset;
  const r = R - inset;
  const cR = W / 2 - R; // center of the right-hand arc (it draws the right side)
  const apexA = Math.acos(-cR / r); // angle on the right arc where x = 0
  const parts: { len: number; at: (t: number) => Pt }[] = [
    { len: 2 * hw, at: (t) => [-hw + 2 * hw * t, bottom] },
    { len: SPRING - bottom, at: (t) => [hw, bottom + (SPRING - bottom) * t] },
    { len: r * apexA, at: (t) => [cR + r * Math.cos(apexA * t), SPRING + r * Math.sin(apexA * t)] },
    { len: r * apexA, at: (t) => [-cR - r * Math.cos(apexA * (1 - t)), SPRING + r * Math.sin(apexA * (1 - t))] },
    { len: SPRING - bottom, at: (t) => [-hw, SPRING - (SPRING - bottom) * t] },
  ];
  const total = parts.reduce((a, p) => a + p.len, 0);
  let d = (((s % 1) + 1) % 1) * total;
  for (const p of parts) {
    if (d <= p.len) return p.at(d / p.len);
    d -= p.len;
  }
  return parts[0].at(0);
}

/** The window's sides and arch grown inward by `inset` (outward if negative): from the bottom right corner, up and over, to the bottom left. */
export function archPath(inset: number, steps = 48): Pt[] {
  const hw = W / 2 - inset;
  const bottom = BOTTOM + inset;
  const r = R - inset;
  const cR = W / 2 - R;
  const apexA = Math.acos(-cR / r);
  const pts: Pt[] = [
    [hw, bottom],
    [hw, (bottom + SPRING) / 2],
    [hw, SPRING],
  ];
  for (let k = 1; k <= steps; k++) {
    const a = (apexA * k) / steps;
    pts.push([cR + r * Math.cos(a), SPRING + r * Math.sin(a)]);
  }
  for (let k = steps - 1; k >= 0; k--) {
    const a = (apexA * k) / steps;
    pts.push([-cR - r * Math.cos(a), SPRING + r * Math.sin(a)]);
  }
  pts.push([-hw, (bottom + SPRING) / 2], [-hw, bottom]);
  return pts;
}

const ring = (inset: number, from: number, to: number, steps: number): Pt[] =>
  Array.from({ length: steps + 1 }, (_, k) => lancetAt(inset, from + ((to - from) * k) / steps));

export const lancetOutline = (inset = 0, steps = 160): Pt[] => ring(inset, 0, 1, steps).slice(0, steps);

/** The kept stretch of a closed list, in order, starting just after a dropped stretch. */
function kept(list: Pt[], keep: (p: Pt) => boolean): Pt[] {
  const n = list.length;
  const start = list.findIndex((p, i) => !keep(p) && keep(list[(i + 1) % n]));
  if (start < 0) return list.filter(keep);
  const out: Pt[] = [];
  for (let k = 1; k <= n; k++) {
    const p = list[(start + k) % n];
    if (!keep(p)) break;
    out.push(p);
  }
  return out;
}

export const circle = (c: Pt, r: number, steps = 28): Pt[] => arc(c[0], c[1], r, 0, Math.PI * 2, steps).slice(0, steps);

/** A leaf's outline: a midrib that bends a little, and a width that swells and tapers to a point. */
function leafOutline(f: LeafFrame): Pt[] {
  const d = dir(f.angle);
  const n: Pt = [-d[1], d[0]];
  const steps = 14;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let k = 0; k <= steps; k++) {
    const u = k / steps;
    const m = leafMid(f, u);
    const h = k === steps ? 0 : leafHalf(f, u);
    left.push(add(m, mul(n, h)));
    right.push(add(m, mul(n, -h)));
  }
  return [...right, ...left.reverse().slice(1)];
}

/** Adds one piece of glass to a window being cut (its tone and, unless given, its grain at random). */
export type Cut = (p: Omit<Piece, "tone" | "grain"> & { grain?: number }) => void;

/** A window being cut: its pieces, and how to add one. */
export function cutter(rand: () => number) {
  const pieces: Piece[] = [];
  const piece: Cut = (p) => void pieces.push({ tone: rand(), grain: p.grain ?? (rand() - 0.5) * 0.6 + Math.PI / 2, ...p });
  return { pieces, piece };
}

/**
 * What every month's window shares: the lancet's border of deep glass with a jewel in every third
 * length, the pale fillet inside it, and the night sky in the head of the arch with its moon and a
 * few stars. Returns the field below the sky, where the month's motif goes.
 */
export function lancetFrame(rand: () => number, piece: Cut) {
  // The border: deep glass cut in short lengths, a round jewel set in every third.
  const centerline = BORDER / 2;
  const segs = 46;
  for (let i = 0; i < segs; i++) {
    const s0 = i / segs;
    const s1 = (i + 1) / segs;
    const outer = ring(0, s0, s1, 4);
    const inner = ring(BORDER, s1, s0, 4);
    const run = sub(lancetAt(centerline, s1), lancetAt(centerline, s0));
    piece({ key: `border-${i}`, kind: "border", points: [...outer, ...inner], grain: Math.atan2(run[1], run[0]) });
    if (i % 3 === 1) piece({ key: `jewel-${i}`, kind: "jewel", points: circle(lancetAt(centerline, (s0 + s1) / 2), BORDER * 0.3) });
  }

  // The fillet: a thin pale band inside the border, in long strips.
  const strips = 10;
  for (let i = 0; i < strips; i++) {
    const s0 = i / strips;
    const s1 = (i + 1) / strips;
    piece({ key: `fillet-${i}`, kind: "fillet", points: [...ring(BORDER, s0, s1, 12), ...ring(BORDER + FILLET, s1, s0, 12)] });
  }

  const field = lancetOutline(BORDER + FILLET, 120);
  const fieldBottom = BOTTOM + BORDER + FILLET;
  /** Where the night sky in the head of the arch begins. */
  const headY = SPRING - 0.12;
  const main = clipHalf(field, [0, headY], [0, 1]);
  const head = clipHalf(field, [0, headY], [0, -1]);

  // The night sky: deep blue pieces, a crescent moon, a few stars.
  const top = Math.max(...head.map((p) => p[1]));
  const skySeeds: Pt[] = [];
  while (skySeeds.length < 11) {
    const p: Pt = [(rand() - 0.5) * W, headY + rand() * (top - headY)];
    if (inside(p, head)) skySeeds.push(p);
  }
  voronoi(relax(skySeeds, head, 2), head).forEach((cell, i) => {
    if (cell.length > 2) piece({ key: `sky-${i}`, kind: "sky", points: cell, grain: rand() * Math.PI });
  });
  const moonC: Pt = [-0.22, headY + (top - headY) * 0.42];
  const moonR = 0.3;
  const biteC = add(moonC, [0.15, 0.08]);
  const biteR = 0.26;
  const outer = kept(circle(moonC, moonR, 72), (p) => len(sub(p, biteC)) > biteR);
  let inner = kept(circle(biteC, biteR, 72), (p) => len(sub(p, moonC)) < moonR);
  // The inner arc picks up where the outer one ends.
  if (len(sub(inner[0], outer[outer.length - 1])) > len(sub(inner[inner.length - 1], outer[outer.length - 1]))) inner = inner.reverse();
  piece({ key: "moon", kind: "moon", points: [...outer, ...inner] });
  const stars: Pt[] = [
    [0.36, headY + (top - headY) * 0.62],
    [0.12, headY + (top - headY) * 0.82],
    [0.55, headY + (top - headY) * 0.25],
    [-0.62, headY + (top - headY) * 0.15],
    [0.02, headY + (top - headY) * 0.2],
  ];
  stars.forEach((c, i) => {
    if (edgeDistance(c, head) > 0.09) piece({ key: `star-${i}`, kind: "star", points: circle(c, 0.04 + 0.018 * ((i * 7) % 3), 16) });
  });
  return { main, fieldBottom, headY, moon: { c: moonC, r: moonR } };
}

/** The pale glass behind a motif, cut in irregular pieces like old cathedral glass. */
export function cathedralGround(rand: () => number, piece: Cut, main: Pt[], fieldBottom: number, headY: number) {
  const groundSeeds: Pt[] = [];
  const step = 0.34;
  for (let y = fieldBottom + step / 2; y < headY; y += step) {
    for (let x = -W / 2 + step / 2; x < W / 2; x += step * 1.1) {
      const p: Pt = [x + (rand() - 0.5) * step * 0.9, y + (rand() - 0.5) * step * 0.9];
      if (inside(p, main)) groundSeeds.push(p);
    }
  }
  voronoi(relax(groundSeeds, main, 2), main).forEach((cell, i) => {
    if (cell.length > 2) piece({ key: `ground-${i}`, kind: "ground", points: cell, grain: Math.PI / 2 + (rand() - 0.5) * 0.5 });
  });
}

/** Puts the pieces in paint order (what's behind first) and completes the design. */
export function finishDesign(pieces: Piece[], moon: Design["moon"]): Design {
  const order: PieceKind[] = ["ground", "sky", "stem", "bud", "night", "sun", "moon", "star", "fillet", "border", "jewel"];
  pieces.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const bars = [0.2, 0.42, 0.64].map((f) => BOTTOM + (SPRING - BOTTOM) * f);
  return { width: W, height: H, outline: lancetOutline(0, 200), pieces, bars, moon };
}

/** November's window: a vine climbing the lancet, a leaf per night. */
export function vineWindow(days: number, seed: string): Design {
  const rand = seeded(seed + ":vine");
  const { pieces, piece } = cutter(rand);
  const { main, fieldBottom, headY, moon } = lancetFrame(rand, piece);

  // The vine: a stem that sways up the middle, cut in lengths, with a bud at the tip.
  const stemTop = headY - 0.22;
  const sway = 0.2;
  const phase = rand() * Math.PI * 2;
  const stemAt = (t: number): Pt => [sway * Math.sin(phase + t * Math.PI * 2.3) * (0.4 + 0.6 * t), lerp(fieldBottom, stemTop, t)];
  const stemWidth = (t: number) => lerp(0.085, 0.034, t);
  const tangent = (t: number) => {
    const d = sub(stemAt(t + 0.002), stemAt(t - 0.002));
    return Math.atan2(d[1], d[0]);
  };
  const edge = (t: number, side: number): Pt => {
    const a = tangent(t) + (side * Math.PI) / 2;
    return add(stemAt(t), mul(dir(a), stemWidth(t) / 2));
  };
  const lengths = 9;
  const stemPieces: Pt[][] = [];
  for (let i = 0; i < lengths; i++) {
    const t0 = i / lengths;
    const t1 = (i + 1) / lengths;
    const ts = Array.from({ length: 7 }, (_, k) => lerp(t0, t1, k / 6));
    const pts = [...ts.map((t) => edge(t, -1)), ...ts.reverse().map((t) => edge(t, 1))];
    if (i === 0) pts[0][1] = pts[pts.length - 1][1] = fieldBottom - 0.02;
    stemPieces.push(pts);
    piece({ key: `stem-${i}`, kind: "stem", points: pts, grain: tangent((t0 + t1) / 2) });
  }
  const tip = stemAt(1);
  const tipA = tangent(0.999);
  const bud = leafOutline({ base: tip, angle: tipA, length: 0.2, width: 0.12, bend: 0, a: 0.75, b: 0.7 });
  piece({ key: "bud", kind: "bud", points: bud, grain: tipA });

  // The leaves, one per night, alternating sides as the vine climbs.
  const leaves: { frame: LeafFrame; points: Pt[] }[] = [];
  // Each leaf has to clear the ones below it, the stem, the bud and the edge of the field, and
  // leave room where the next few nights' leaves will grow from: a night has to be a leaf you
  // can find, never a speck squeezed in later. A leaf that doesn't fit first turns and slides a
  // little, then shrinks, but only so far: past that it goes in anyway, brushing a neighbor.
  // The lower leaves come first.
  const ts = Array.from({ length: days }, (_, i) => 0.035 + (0.93 * (i + 0.5)) / days + (rand() - 0.5) * 0.008);
  const sprouts = ts.map((t, i) => edge(t, (i + 1) % 2 ? -1 : 1));
  const fits = (pts: Pt[], d: number, room = true) =>
    pts.every((p) => inside(p, main) && edgeDistance(p, main) > 0.045) &&
    leaves.every((o) => !overlaps(pts, o.points)) &&
    stemPieces.every((s) => !overlaps(pts.slice(2, -2), s)) &&
    !overlaps(pts, bud) &&
    (!room || [sprouts[d + 1], sprouts[d + 3]].filter(Boolean).every((s) => !inside(s, pts) && edgeDistance(s, pts) > 0.14));
  for (let d = 1; d <= days; d++) {
    const t = ts[d - 1];
    const side = d % 2 ? -1 : 1;
    const along = tangent(t);
    let frame: LeafFrame = {
      a: 0.6 + rand() * 0.7,
      b: 0.6 + rand() * 0.45,
      base: edge(t, side),
      // edge(t, 1) is the stem's left side, so a leaf there points up and to the left.
      angle: along + side * (0.95 + rand() * 0.35),
      length: lerp(0.8, 0.5, t) * (0.85 + rand() * 0.3),
      width: 0,
      bend: (rand() - 0.5) * 0.2,
    };
    frame.width = frame.length * (0.3 + rand() * 0.16);
    let points = leafOutline(frame);
    const turn = frame.angle - along;
    let placed = fits(points, d);
    search: for (let scale = 1; scale >= 0.55 && !placed; scale *= 0.9)
        for (const slide of [0, 0.012, -0.012])
          for (const up of [0, -0.2, 0.25, -0.4]) {
            const at = t + slide;
            // A negative "up" turns the leaf toward the stem's tip; a positive one opens it outward.
            const tried: LeafFrame = { ...frame, base: edge(at, side), angle: tangent(at) + turn + side * up, length: frame.length * scale, width: frame.width * scale };
            const pts = leafOutline(tried);
            if (fits(pts, d)) {
              frame = tried;
              points = pts;
              placed = true;
              break search;
            }
          }
    // Nothing fit: it goes in at a size you can still see, brushing a neighbor if it must.
    if (!placed) {
      frame = { ...frame, length: frame.length * 0.6, width: frame.width * 0.6 };
      points = leafOutline(frame);
    }
    leaves.push({ frame, points });
  }
  leaves.forEach((l, i) => piece({ key: `night-${i + 1}`, kind: "night", day: i + 1, points: l.points, leaf: l.frame, grain: l.frame.angle }));

  // The pale glass behind it all.
  cathedralGround(rand, piece, main, fieldBottom, headY);
  return finishDesign(pieces, moon);
}
