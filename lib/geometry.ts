// Small shared helpers for the window's shapes: points, polygons, seeded randomness.

export type Pt = [number, number];

const round = (n: number) => Math.round(n * 100) / 100;

/** An SVG path through the points, closed. */
export const toPath = (poly: Pt[]) => "M" + poly.map(([x, y]) => `${round(x)} ${round(y)}`).join(" L") + " Z";

/** Small seeded random, so the same month always gets the same window. */
export function seeded(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
export const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];
export const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
export const dot = (a: Pt, b: Pt) => a[0] * b[0] + a[1] * b[1];
export const len = (a: Pt) => Math.hypot(a[0], a[1]);
export const dir = (angle: number): Pt => [Math.cos(angle), Math.sin(angle)];
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Points along a circular arc, both ends included. */
export const arc = (cx: number, cy: number, r: number, from: number, to: number, steps: number): Pt[] =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const a = from + ((to - from) * k) / steps;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

/** Signed area (positive when counter-clockwise). */
export function area(poly: Pt[]) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

export function centroid(poly: Pt[]): Pt {
  let cx = 0;
  let cy = 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x0, y0] = poly[i];
    const [x1, y1] = poly[(i + 1) % poly.length];
    const c = x0 * y1 - x1 * y0;
    a += c;
    cx += (x0 + x1) * c;
    cy += (y0 + y1) * c;
  }
  if (Math.abs(a) < 1e-9) return poly[0];
  return [cx / (3 * a), cy / (3 * a)];
}

/** Is the point inside the polygon (any winding)? */
export function inside([x, y]: Pt, poly: Pt[]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Keeps the part of a convex or concave polygon where dot(p - o, n) <= 0 (Sutherland-Hodgman, one plane). */
export function clipHalf(poly: Pt[], o: Pt, n: Pt): Pt[] {
  const out: Pt[] = [];
  const side = (p: Pt) => dot(sub(p, o), n);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if ((sa <= 0) !== (sb <= 0)) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Voronoi cells of the seeds inside a convex region. */
export function voronoi(seeds: Pt[], region: Pt[]): Pt[][] {
  return seeds.map((s, i) => {
    let cell = region;
    for (let j = 0; j < seeds.length && cell.length > 2; j++) {
      if (j === i) continue;
      const o = mul(add(s, seeds[j]), 0.5);
      cell = clipHalf(cell, o, sub(seeds[j], s));
    }
    return cell;
  });
}

/** Relaxes seeds toward their cells' centers, so the cells come out even (but still hand-cut). */
export function relax(seeds: Pt[], region: Pt[], rounds: number): Pt[] {
  let s = seeds;
  for (let r = 0; r < rounds; r++) s = voronoi(s, region).map((c, i) => (c.length > 2 ? centroid(c) : s[i]));
  return s;
}

/** Do two segments cross? */
function crosses(a: Pt, b: Pt, c: Pt, d: Pt) {
  const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** Do two polygons overlap (an edge crossing, or one inside the other)? */
export function overlaps(p: Pt[], q: Pt[]) {
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    for (let j = 0; j < q.length; j++) if (crosses(a, b, q[j], q[(j + 1) % q.length])) return true;
  }
  return inside(p[0], q) || inside(q[0], p);
}

/** Distance from a point to a polygon's edge. */
export function edgeDistance(p: Pt, poly: Pt[]) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ab = sub(b, a);
    const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / Math.max(dot(ab, ab), 1e-12)));
    best = Math.min(best, len(sub(p, add(a, mul(ab, t)))));
  }
  return best;
}
