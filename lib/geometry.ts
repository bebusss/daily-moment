// Small polygon helpers for cutting glass: a pane is a polygon, and cutting it
// with a few straight lines gives the shards a real stained-glass pane is made of.

export type Pt = [number, number];

export const polar = (cx: number, cy: number, r: number, a: number): Pt => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

export function area(poly: Pt[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

export function centroid(poly: Pt[]): Pt {
  const n = poly.length;
  return [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
}

/** Cuts a convex-ish polygon with a straight line through `at` at angle `angle`: the two pieces. */
export function split(poly: Pt[], at: Pt, angle: number): [Pt[], Pt[]] {
  const dir: Pt = [Math.cos(angle), Math.sin(angle)];
  const side = (p: Pt) => (p[0] - at[0]) * dir[1] - (p[1] - at[1]) * dir[0];
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    (sa >= 0 ? left : right).push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      const cut: Pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      left.push(cut);
      right.push(cut);
    }
  }
  return [left, right];
}

/** Is the point inside the polygon (even-odd rule)? */
export function inside([x, y]: Pt, poly: Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * Cuts a polygon into Voronoi cells around the given points: each shard is the
 * part of the polygon closer to its point than to any other, the way glass
 * cutters lay out a pane. Each cut is a straight line halfway between two points.
 */
export function voronoi(poly: Pt[], points: Pt[]): Pt[][] {
  return points.map((p, i) => {
    let cell = poly;
    points.forEach((q, j) => {
      if (i === j || cell.length < 3) return;
      const mid: Pt = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      // The bisector runs perpendicular to the segment p→q; keep the half that holds p.
      const angle = Math.atan2(q[1] - p[1], q[0] - p[0]) + Math.PI / 2;
      const [left, right] = split(cell, mid, angle);
      const dir: Pt = [Math.cos(angle), Math.sin(angle)];
      const pSide = (p[0] - mid[0]) * dir[1] - (p[1] - mid[1]) * dir[0];
      cell = pSide >= 0 ? left : right;
    });
    return cell;
  }).filter((c) => c.length > 2 && area(c) > 20);
}

const round = (n: number) => Math.round(n * 100) / 100;

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
