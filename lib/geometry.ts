// Small shared helpers for the window's shapes.

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
