// A "hammered glass" surface: the little dents of hand-made glass, as a normal
// map drawn once on a canvas (no image files). Light catches on the dents, which
// is most of what makes the panes read as real glass.

import * as THREE from "three";

let cached: THREE.CanvasTexture | null = null;

export function hammeredGlass(): THREE.CanvasTexture {
  if (cached) return cached;
  const size = 256;
  const height = document.createElement("canvas");
  height.width = height.height = size;
  const h = height.getContext("2d")!;
  h.fillStyle = "#808080";
  h.fillRect(0, 0, size, size);
  // Soft round bumps, wrapped at the edges so the texture tiles without seams.
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 22;
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
      const g = h.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      g.addColorStop(0, "rgba(255,255,255,0.22)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      h.fillStyle = g;
      h.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }
  const src = h.getImageData(0, 0, size, size).data;
  const out = document.createElement("canvas");
  out.width = out.height = size;
  const o = out.getContext("2d")!;
  const img = o.createImageData(size, size);
  const at = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Slope of the height map, turned into a normal.
      const dx = (at(x + 1, y) - at(x - 1, y)) * 2.5;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 2.5;
      const len = Math.hypot(dx, dy, 1);
      const k = (y * size + x) * 4;
      img.data[k] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  }
  o.putImageData(img, 0, 0);
  cached = new THREE.CanvasTexture(out);
  cached.wrapS = cached.wrapT = THREE.RepeatWrapping;
  cached.repeat.set(1.6, 1.6);
  return cached;
}
