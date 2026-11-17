// Cathedral glass, drawn once on a canvas (no image files): rolled glass has long
// wavy streaks, slow mottling and tiny trapped bubbles, so light comes through it
// unevenly. The same drawing gives two textures: how much light each spot lets
// through (used as the glass's glow), and the surface's ripples (a normal map).

import * as THREE from "three";

let cached: { light: THREE.CanvasTexture; ripples: THREE.CanvasTexture } | null = null;

export function cathedralGlass() {
  if (cached) return cached;
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgb(200,200,200)";
  g.fillRect(0, 0, size, size);

  // Slow mottling: big soft light and dark patches.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 60 + Math.random() * 140;
    const light = Math.random() > 0.5;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, light ? "rgba(255,255,255,0.28)" : "rgba(90,90,90,0.22)");
    grad.addColorStop(1, "rgba(128,128,128,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }

  // Long wavy streaks, mostly in one direction, like glass that was rolled.
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * size;
    const amp = 4 + Math.random() * 14;
    const freq = 0.01 + Math.random() * 0.02;
    const phase = Math.random() * Math.PI * 2;
    g.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${0.08 + Math.random() * 0.18})` : `rgba(60,60,60,${0.06 + Math.random() * 0.14})`;
    g.lineWidth = 1 + Math.random() * 5;
    g.beginPath();
    for (let y = -10; y <= size + 10; y += 6) {
      const px = x + Math.sin(y * freq + phase) * amp;
      if (y === -10) g.moveTo(px, y);
      else g.lineTo(px, y);
    }
    g.stroke();
  }

  // Tiny bubbles ("seeds") caught in the glass.
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.8 + Math.random() * 2.2;
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }

  // The surface ripples come from the same drawing: its slopes turned into normals.
  const src = g.getImageData(0, 0, size, size).data;
  const n = document.createElement("canvas");
  n.width = n.height = size;
  const ng = n.getContext("2d")!;
  const img = ng.createImageData(size, size);
  const at = (x: number, y: number) => src[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * 3;
      const dy = (at(x, y + 1) - at(x, y - 1)) * 3;
      const len = Math.hypot(dx, dy, 1);
      const k = (y * size + x) * 4;
      img.data[k] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[k + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[k + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[k + 3] = 255;
    }
  }
  ng.putImageData(img, 0, 0);

  const light = new THREE.CanvasTexture(c);
  light.colorSpace = THREE.SRGBColorSpace;
  const ripples = new THREE.CanvasTexture(n);
  for (const t of [light, ripples]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.9, 0.9);
  }
  cached = { light, ripples };
  return cached;
}

/** A copy of a texture turned and shifted, so every pane's glass runs its own way, like separately cut pieces. */
export function turned(t: THREE.Texture, seed: number): THREE.Texture {
  const copy = t.clone();
  const r = Math.sin(seed * 12.9898) * 43758.5453;
  const f = r - Math.floor(r);
  copy.center.set(0.5, 0.5);
  copy.rotation = (f - 0.5) * 0.9;
  copy.offset.set(f * 3.1, f * 1.7);
  copy.needsUpdate = true;
  return copy;
}
