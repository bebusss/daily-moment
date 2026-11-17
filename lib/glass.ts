// Color helpers for the glass: blending toward white or black, saturation, and one
// palette color per night (seeded, so the same month always looks the same).

import { seeded } from "@/lib/geometry";

type RGB = [number, number, number];

const toRgb = (hex: string): RGB => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const toHex = ([r, g, b]: RGB) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

/** Blends a color toward white (amount > 0) or black (amount < 0). */
export function mix(hex: string, amount: number): string {
  const target = amount >= 0 ? 255 : 0;
  const t = Math.abs(amount);
  return toHex(toRgb(hex).map((v) => v + (target - v) * t) as RGB);
}

/** Pushes a color's saturation up (k > 1) or down (k < 1), keeping its lightness. */
export function saturate(hex: string, k: number): string {
  const rgb = toRgb(hex);
  const grey = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
  return toHex(rgb.map((v) => grey + (v - grey) * k) as RGB);
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

/** Picks from a list by a 0..1 number. */
export const pick = <T,>(list: T[], tone: number) => list[Math.min(list.length - 1, Math.floor(tone * list.length))];
