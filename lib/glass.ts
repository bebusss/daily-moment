// Color helpers for the glass: blending toward white or black, and one palette
// color per night (seeded, so the same month always looks the same).

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
