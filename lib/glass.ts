// How the glass looks: each night's color comes from the month's palette, and
// how heavy the day was decides how deep it glows. Every pane looks good;
// weight changes how deep it is, never whether it counts.

import type { Weight } from "@/lib/data";
import { seeded } from "@/lib/geometry";

type RGB = [number, number, number];

const toRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: RGB) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** Blends a color toward white (amount > 0) or black (amount < 0). */
export function mix(hex: string, amount: number): string {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(toRgb(hex).map((v) => v + (target - v) * t) as RGB);
}

/** Heavy days are deep, rich glass; light days are paler and airier. */
const DEPTH: Record<Weight, number> = { 3: -0.3, 2: -0.12, 1: 0.1 };

/** One palette color per night, never the same as the night before. */
export function paneColors(palette: string[], days: number, seed: string): string[] {
  const rand = seeded(seed + ":colors");
  const out: string[] = [];
  let prev = -1;
  for (let i = 0; i < days; i++) {
    let pick = Math.floor(rand() * palette.length);
    if (pick === prev) pick = (pick + 1) % palette.length;
    out.push(palette[pick]);
    prev = pick;
  }
  return out;
}

/** Each shard of a lit pane: the night's color, at its depth, varied a little piece by piece like hand-made glass. */
export function shardColors(base: string, weight: Weight, shards: number, seed: string): string[] {
  const rand = seeded(seed);
  return Array.from({ length: shards }, () => mix(base, DEPTH[weight] + (rand() - 0.5) * 0.3));
}
