// The geometry of the month's rose window: one pane per night.
// Night 1 is the center, then the rings fill outward, clockwise from the top,
// so the window grows from the middle as the month goes on. Each pane is cut
// into a few shards, the way real stained glass is made of small pieces.

import { inside, polar, seeded, voronoi, type Pt } from "@/lib/geometry";

export type Pane = {
  /** 1-based night of the month. */
  day: number;
  /** The pane's outline (its lead, or its gold mending lead). */
  outline: Pt[];
  /** The pieces of glass inside it. */
  shards: Pt[][];
};

/** How many panes each ring holds, from the center out. The outer ring takes whatever the month has left. */
export const ringSizes = (days: number) => [1, 6, 10, days - 17];

/** Ring edges as fractions of the radius: center disc, then three rings of roughly equal pane area. */
export const RADII = [0, 0.21, 0.48, 0.74, 1];

/** The pane as a polygon: a circle in the middle, ring segments around it. Coordinates run 0..2·radius. */
function paneShape(ring: number, i: number, count: number, radius: number): Pt[] {
  const c = radius;
  const outer = RADII[ring + 1] * radius;
  if (ring === 0) return Array.from({ length: 48 }, (_, k) => polar(c, c, outer, (k / 48) * Math.PI * 2));
  const inner = RADII[ring] * radius;
  const step = (Math.PI * 2) / count;
  // Every other ring starts half a pane later, like brickwork, so the leads don't line up.
  const a0 = -Math.PI / 2 + (ring % 2 === 1 ? step / 2 : 0) + i * step;
  const arc = (r: number, from: number, to: number) => Array.from({ length: 13 }, (_, k) => polar(c, c, r, from + ((to - from) * k) / 12));
  return [...arc(outer, a0, a0 + step), ...arc(inner, a0 + step, a0)];
}

/** Cuts a pane into a few shards around random points inside it (lib/geometry voronoi). */
function shatter(poly: Pt[], count: number, rand: () => number): Pt[][] {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const points: Pt[] = [];
  for (let tries = 0; points.length < count && tries < 200; tries++) {
    const p: Pt = [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];
    // Points too close together make slivers.
    if (inside(p, poly) && points.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 12)) points.push(p);
  }
  return points.length > 1 ? voronoi(poly, points) : [poly];
}

export function roseWindow(days: number, radius: number, seed: string): Pane[] {
  const rand = seeded(seed);
  const panes: Pane[] = [];
  let day = 1;
  ringSizes(days).forEach((count, ring) => {
    for (let i = 0; i < count; i++) {
      const outline = paneShape(ring, i, count, radius);
      panes.push({ day: day++, outline, shards: shatter(outline, ring === 0 ? 6 : 3 + Math.floor(rand() * 2), rand) });
    }
  });
  return panes;
}
