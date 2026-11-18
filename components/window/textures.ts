// The window's pictures as textures. The window is painted once (lib/paint); after that only
// the nights that change are repainted, and a canvas that didn't change keeps its texture, so
// it isn't sent to the graphics card again. The stone and the air's noise are painted once.

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { seeded, type Pt } from "@/lib/geometry";
import { paintOutside, paintStone, paintWindow, repaintWindow, type PaintedWindow } from "@/lib/paint";
import { timed } from "@/lib/perf";
import type { WindowModel } from "@/lib/window-model";

// Textures

export function canvasTexture(c: HTMLCanvasElement, color: boolean, nearest = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  if (nearest) {
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  }
  return t;
}

// The window is painted once; after that only the nights that change are repainted, and a canvas
// that didn't change keeps its texture (so it isn't sent to the graphics card again).
let lastPainted: PaintedWindow | null = null;

let lastOutside: {
  outline: Pt[];
  painted: ReturnType<typeof paintOutside>;
} | null = null;

export const textureOf = new WeakMap<HTMLCanvasElement, THREE.CanvasTexture>();

export function paintFor(model: WindowModel) {
  if (lastPainted?.model === model) return lastPainted;
  const again = lastPainted && timed("window:repaint", () => repaintWindow(lastPainted!, model));
  lastPainted = again || timed("window:paint-glass", () => paintWindow(model));
  return lastPainted;
}

export function outsideFor(model: WindowModel) {
  if (lastOutside?.outline !== model.outline)
    lastOutside = {
      outline: model.outline,
      painted: timed("window:paint-outside", () => paintOutside(model)),
    };
  return lastOutside.painted;
}

export function textureFor(c: HTMLCanvasElement, color: boolean, nearest = false) {
  let t = textureOf.get(c);
  if (!t) textureOf.set(c, (t = canvasTexture(c, color, nearest)));
  return t;
}

export function useWindowTextures(model: WindowModel) {
  const painted = useMemo(() => paintFor(model), [model]);
  const textures = useMemo(() => {
    const outside = outsideFor(model);
    return {
      glass: textureFor(painted.glass, true),
      lead: textureFor(painted.lead, false),
      mask: textureFor(painted.mask, false),
      ids: textureFor(painted.ids, false, true),
      sharp: textureFor(outside.sharp, true),
      soft: textureFor(outside.soft, true),
      sun: new THREE.Vector2(...outside.sun),
    };
  }, [model, painted]);
  // Free textures nothing uses any more: not this set, nor the one before it (tonight's leaf
  // fills in from that one).
  const live = useRef<THREE.Texture[]>([]);
  const recent = useRef<THREE.Texture[][]>([]);
  useEffect(() => {
    const now: THREE.Texture[] = Object.values(textures).filter((t) => t instanceof THREE.Texture);
    recent.current = [...recent.current.slice(-1), now];
    const keep = new Set(recent.current.flat());
    for (const t of live.current) if (!keep.has(t)) t.dispose();
    live.current = [...keep];
  }, [textures]);
  return { textures, paneAt: painted.paneAt };
}

/** A small tiling noise for the dust in the air. */
/**
 * Raindrops on glass, as a tiling texture: rg is which way each drop bends the light, b its
 * highlight, a how much of the spot is water.
 */
let rain: THREE.DataTexture | null = null;
export function rainTexture() {
  if (rain) return rain;
  const size = 256;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) [data[i * 4], data[i * 4 + 1]] = [128, 128];
  const rand = seeded("rain");
  const wrap = (v: number) => ((Math.round(v) % size) + size) % size;
  for (let n = 0; n < 55; n++) {
    const [cx, cy] = [rand() * size, rand() * size];
    const r = 3 + rand() * rand() * 11;
    const tall = 1.15 + rand() * 0.35;
    for (let y = -r * tall; y <= r * tall; y++)
      for (let x = -r; x <= r; x++) {
        const [dx, dy] = [x / r, y / (r * tall)];
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const k = (wrap(cy + y) * size + wrap(cx + x)) * 4;
        data[k] = 128 + dx * 110;
        data[k + 1] = 128 - dy * 110;
        data[k + 2] = Math.max(data[k + 2], Math.max(0, 1 - ((dx + 0.35) ** 2 + (dy + 0.4) ** 2) * 7) * 255);
        data[k + 3] = Math.max(data[k + 3], (1 - d2 * d2) * 235);
      }
  }
  rain = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  rain.wrapS = rain.wrapT = THREE.RepeatWrapping;
  rain.magFilter = rain.minFilter = THREE.LinearFilter;
  rain.needsUpdate = true;
  return rain;
}

export function noiseTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const rand = seeded("air");
  g.fillStyle = "rgb(110,110,110)";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 160; i++) {
    const r = 6 + rand() * 40;
    const x = rand() * size;
    const y = rand() * size;
    const c2 = rand() > 0.5 ? "255,255,255" : "0,0,0";
    for (const dx of [-size, 0, size])
      for (const dy of [-size, 0, size]) {
        const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
        grad.addColorStop(0, `rgba(${c2},0.18)`);
        grad.addColorStop(1, `rgba(${c2},0)`);
        g.fillStyle = grad;
        g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
      }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export type Painted = ReturnType<typeof useWindowTextures>["textures"];

export const stones = new Map<number, ReturnType<typeof paintStone>>();

export function stoneFor(size: number) {
  let stone = stones.get(size);
  if (!stone) stones.set(size, (stone = timed("window:paint-stone", () => paintStone(size))));
  return stone;
}
