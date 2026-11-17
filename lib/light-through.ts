// What the window shows and casts, drawn once on canvases (no image files):
// - outside(): the evening outside the glass. A golden-hour sky, brighter where the
//   sun is, with soft blurry shapes (trees, a roofline) you half-see through textured
//   glass. Every pane is lit by its own part of it, tinted by its color.
// - cast(): the window's colors as they land on the sill: bright where the glass is
//   lit, dark lines where the leads are, slightly soft.

import * as THREE from "three";
import { toPath, type Pt } from "@/lib/geometry";
import type { WindowModel } from "@/lib/window-model";

/** Pixels per scene unit in these textures. */
const PX = 220;

export function outside(model: WindowModel): THREE.CanvasTexture {
  const w = Math.round(model.width * PX);
  const h = Math.round(model.height * PX);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;

  // The sky at golden hour: pale gold at the top, amber lower down.
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#ffe6bf");
  sky.addColorStop(0.45, "#f3c088");
  sky.addColorStop(1, "#c47b4a");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // The sun, low and to the right.
  const sun = g.createRadialGradient(w * 0.74, h * 0.3, 0, w * 0.74, h * 0.3, w * 0.75);
  sun.addColorStop(0, "rgba(255,250,235,0.85)");
  sun.addColorStop(0.25, "rgba(255,236,200,0.5)");
  sun.addColorStop(1, "rgba(255,220,170,0)");
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);

  // Soft shapes outside: foliage on the left, a roofline low on the right. Very blurred, like through rolled glass.
  g.filter = "blur(22px)";
  g.fillStyle = "rgba(70,45,30,0.42)";
  for (const [x, y, r] of [
    [0.05, 0.5, 0.32],
    [0.18, 0.7, 0.28],
    [0.02, 0.85, 0.35],
    [0.3, 0.92, 0.25],
  ]) {
    g.beginPath();
    g.ellipse(w * x, h * y, w * r, w * r * 0.8, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = "rgba(90,55,35,0.35)";
  g.fillRect(w * 0.55, h * 0.82, w * 0.6, h * 0.25);
  g.filter = "none";

  // Rolled glass: long wavy streaks of light and shade.
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * w;
    const amp = 3 + Math.random() * 10;
    const freq = 0.012 + Math.random() * 0.02;
    const phase = Math.random() * Math.PI * 2;
    g.strokeStyle = Math.random() > 0.5 ? `rgba(255,255,255,${0.05 + Math.random() * 0.12})` : `rgba(80,50,30,${0.04 + Math.random() * 0.1})`;
    g.lineWidth = 1 + Math.random() * 4;
    g.beginPath();
    for (let y = -10; y <= h + 10; y += 6) {
      const px = x + Math.sin(y * freq + phase) * amp;
      if (y === -10) g.moveTo(px, y);
      else g.lineTo(px, y);
    }
    g.stroke();
  }
  // Tiny bubbles caught in the glass.
  g.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 70; i++) {
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, 0.6 + Math.random() * 1.6, 0, Math.PI * 2);
    g.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  // The glass's UVs are its position in the window: map the window's box onto the texture.
  t.repeat.set(1 / model.width, 1 / model.height);
  t.offset.set(0.5, 0.5);
  return t;
}

/** The window's light as it lands on the sill: lit glass bright and colored, unlit glass dim, leads dark. */
export function cast(model: WindowModel): THREE.CanvasTexture {
  const w = Math.round(model.width * PX);
  const h = Math.round(model.height * PX);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, w, h);
  const toCanvas = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [(x + model.width / 2) * PX, (model.height / 2 - y) * PX]);
  g.filter = "blur(3px)";
  for (const p of model.panes) {
    const lit = p.status === "done" || p.status === "crown" || p.status === "gap" || p.status === "jewel";
    g.globalAlpha = lit ? 0.9 : 0.25;
    g.fillStyle = p.color;
    g.fill(new Path2D(toPath(toCanvas(p.points))));
    g.globalAlpha = 1;
    g.strokeStyle = "#000";
    g.lineWidth = 7;
    g.stroke(new Path2D(toPath(toCanvas(p.points))));
  }
  g.filter = "none";
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
