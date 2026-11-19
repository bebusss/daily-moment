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

// OKLab: a color space where equal lightness looks equally light whatever the hue (Björn
// Ottosson, 2020). Blue at 0.5 and orange at 0.5 read as the same depth; in RGB they don't.
const toLinear = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function toOklab(hex: string): RGB {
  const [r, g, b] = toRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab to linear RGB, which may fall outside 0..1 (out of gamut). */
function fromOklab([L, a, b]: RGB): RGB {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/**
 * The same hue at a set lightness and colorfulness (OKLCH): `lightness` 0 black to 1 white,
 * `chroma` about 0 grey to 0.3 the most vivid. If that's more vivid than a screen can show, the
 * color is made as vivid as it can be, keeping its hue and lightness.
 */
export function atDepth(hex: string, lightness: number, chroma: number): string {
  const [, a, b] = toOklab(hex);
  const hue = Math.atan2(b, a);
  const at = (c: number) => fromOklab([lightness, c * Math.cos(hue), c * Math.sin(hue)]);
  const fits = (rgb: RGB) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
  let [lo, hi] = [0, chroma];
  if (!fits(at(hi))) {
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (fits(at(mid))) lo = mid;
      else hi = mid;
    }
    hi = lo;
  }
  return toHex(at(hi).map(fromLinear) as RGB);
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
