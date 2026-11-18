// The month's window designs. A new one each month (the house rotation is free; choosing your own
// is Plus). They all share the same lancet, cut by lancetFrame in lib/vine.ts: its border of deep
// glass with jewels, its pale fillet, and the night sky in its head with tonight's moon. What fills
// the rest, one piece of glass per night, is the month's motif:
// - vine: a vine climbing the window, a leaf per night (lib/vine.ts);
// - rose: a rosette in three rings of petals, a petal per night, set in diamond quarries;
// - sunburst: a sun rising from the sill, a ray per night.
// Night 1 is always where the eye starts: the bottom of the vine, the top of the rose's inner ring,
// the leftmost ray.

import type { DesignName } from "@/lib/data";
import { area, centroid, clipHalf, dir, lerp, seeded, type Pt } from "@/lib/geometry";
import { cathedralGround, circle, cutter, finishDesign, lancetFrame, vineWindow, W, type Cut, type Design } from "@/lib/vine";

export const DESIGNS: Record<DesignName, { name: string }> = {
  vine: { name: "Vine" },
  rose: { name: "Rose" },
  sunburst: { name: "Sunburst" },
};

/** Cuts a month's window in the given design. */
export function cutWindow(design: DesignName, days: number, seed: string): Design {
  return design === "rose" ? roseWindow(days, seed) : design === "sunburst" ? sunburstWindow(days, seed) : vineWindow(days, seed);
}

/** A polygon clipped to a convex region (counter-clockwise), one edge at a time. */
function clipTo(poly: Pt[], region: Pt[]): Pt[] {
  let out = poly;
  for (let i = 0; i < region.length && out.length > 2; i++) {
    const a = region[i];
    const b = region[(i + 1) % region.length];
    // Outward normal of a counter-clockwise edge.
    out = clipHalf(out, a, [b[1] - a[1], -(b[0] - a[0])]);
  }
  return out;
}

/** The ring around `c` between radii `r0` and `r1`, from angle `a0` to `a1`, its outer edge shaped by `bulge(t)`. */
function sector(c: Pt, r0: number, r1: number, a0: number, a1: number, bulge: (t: number) => number = () => 0, steps = 10): Pt[] {
  const outer = Array.from({ length: steps + 1 }, (_, k): Pt => {
    const t = k / steps;
    const a = lerp(a0, a1, t);
    const r = r1 + bulge(t);
    return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
  });
  const inner = Array.from({ length: steps + 1 }, (_, k): Pt => {
    const a = lerp(a1, a0, k / steps);
    return [c[0] + r0 * Math.cos(a), c[1] + r0 * Math.sin(a)];
  });
  return [...outer, ...inner];
}

/** A petal pointing out from `c` along `a`: from radius `r0` to `r1`, at most `w` wide. */
function petal(c: Pt, a: number, r0: number, r1: number, w: number, steps = 12): Pt[] {
  const d = dir(a);
  const n: Pt = [-d[1], d[0]];
  const at = (u: number, side: number): Pt => {
    const r = lerp(r0, r1, u);
    const h = side * w * Math.sin(Math.PI * u) ** 0.75;
    return [c[0] + d[0] * r + n[0] * h, c[1] + d[1] * r + n[1] * h];
  };
  const right = Array.from({ length: steps + 1 }, (_, k) => at(k / steps, -1));
  const left = Array.from({ length: steps - 1 }, (_, k) => at((steps - 1 - k) / steps, 1));
  return [...right, ...left];
}

/**
 * September's window: a rosette, a petal per night in three rings (six petals in the middle, the
 * rest shared between two rings around them), with a gold boss at its heart and a band of deep
 * glass round it, set in pale diamond quarries.
 */
export function roseWindow(days: number, seed: string): Design {
  const rand = seeded(seed + ":rose");
  const { pieces, piece } = cutter(rand);
  const { main, fieldBottom, headY, moon } = lancetFrame(rand, piece);
  quarries(piece, main, fieldBottom, headY);

  const c: Pt = [0, -0.72];
  const inner = 6;
  const middle = Math.floor((days - inner) / 2);
  const outer = days - inner - middle;
  const gap = 0.035;
  let day = 1;
  const night = (points: Pt[]) => {
    piece({ key: `night-${day}`, kind: "night", day, points, grain: Math.atan2(centroid(points)[1] - c[1], centroid(points)[0] - c[0]) });
    day++;
  };
  // Clockwise from the top, ring by ring, outward.
  for (let k = 0; k < inner; k++) night(petal(c, Math.PI / 2 - (k * 2 * Math.PI) / inner, 0.15, 0.43, 0.115));
  for (let k = 0; k < middle; k++) {
    const a = Math.PI / 2 - ((k + 0.5) * 2 * Math.PI) / middle;
    const half = Math.PI / middle - gap;
    // Pointed at the tip, like a lancet of its own.
    night(sector(c, 0.47, 0.63, a + half, a - half, (t) => 0.07 * (1 - Math.abs(2 * t - 1)) ** 0.6));
  }
  for (let k = 0; k < outer; k++) {
    const a = Math.PI / 2 - (k * 2 * Math.PI) / outer;
    const half = Math.PI / outer - gap * 0.8;
    // Rounded, like a scallop.
    night(sector(c, 0.73, 0.86, a + half, a - half, (t) => 0.03 * Math.sin(Math.PI * t)));
  }
  piece({ key: "boss", kind: "bud", points: circle(c, 0.115, 28) });
  const bands = 24;
  for (let k = 0; k < bands; k++) {
    const a0 = (k * 2 * Math.PI) / bands;
    piece({ key: `band-${k}`, kind: "border", points: sector(c, 0.91, 0.97, a0 + 0.01, a0 + (2 * Math.PI) / bands - 0.01, () => 0, 4) });
  }
  return finishDesign(pieces, moon);
}

/** Pale diamond quarries filling the field: the classic leaded lattice behind a medallion. */
function quarries(piece: Cut, main: Pt[], fieldBottom: number, headY: number) {
  const [dx, dy] = [0.3, 0.42];
  let i = 0;
  for (let row = 0, y = fieldBottom - dy; y < headY + dy; row++, y += dy / 2) {
    for (let x = -W / 2 - dx + (row % 2 ? dx / 2 : 0); x < W / 2 + dx; x += dx) {
      const diamond: Pt[] = [
        [x, y - dy / 2],
        [x + dx / 2, y],
        [x, y + dy / 2],
        [x - dx / 2, y],
      ];
      const cut = clipTo(diamond, main);
      if (cut.length > 2 && Math.abs(area(cut)) > 0.002) piece({ key: `ground-${i++}`, kind: "ground", points: cut, grain: Math.PI / 2 });
    }
  }
}

/**
 * October's window: a sun rising from the sill, ringed with a gold corona, and a ray per night
 * fanning out across the window from left to right.
 */
export function sunburstWindow(days: number, seed: string): Design {
  const rand = seeded(seed + ":sunburst");
  const { pieces, piece } = cutter(rand);
  const { main, fieldBottom, headY, moon } = lancetFrame(rand, piece);
  cathedralGround(rand, piece, main, fieldBottom, headY);

  const c: Pt = [0, fieldBottom];
  const sun = 0.42;
  const from = Math.PI - 0.1;
  const to = 0.1;
  const step = (from - to) / days;
  const gap = 0.006;
  for (let d = 1; d <= days; d++) {
    const hi = from - (d - 1) * step - gap;
    const lo = from - d * step + gap;
    const mid = (hi + lo) / 2;
    // Between the two angles, and beyond the corona.
    let ray = clipHalf(main, c, dir(lo - Math.PI / 2));
    ray = clipHalf(ray, c, dir(hi + Math.PI / 2));
    const start: Pt = [c[0] + Math.cos(mid) * (sun + 0.19), c[1] + Math.sin(mid) * (sun + 0.19)];
    ray = clipHalf(ray, start, [-Math.cos(mid), -Math.sin(mid)]);
    if (ray.length > 2) piece({ key: `night-${d}`, kind: "night", day: d, points: ray, grain: mid });
  }
  const corona = 11;
  for (let k = 0; k < corona; k++) {
    const a0 = (k * Math.PI) / corona;
    piece({ key: `corona-${k}`, kind: "bud", points: sector(c, sun + 0.04, sun + 0.15, a0 + 0.03, a0 + Math.PI / corona - 0.03, () => 0, 4) });
  }
  piece({ key: "sun", kind: "sun", points: [...circle(c, sun, 64).filter((p) => p[1] >= fieldBottom - 1e-9), [c[0] - sun, fieldBottom]] });
  return finishDesign(pieces, moon);
}
