"use client";

// Next month's crafts, as previews: each one a real material in the same dim, warm room as the
// window, painted on a canvas (no image files) in the month's colors. They show the finished
// piece as you'd expect it. How each one mends a missed night is never shown: it's a surprise.

import { useEffect, useRef } from "react";
import { seeded } from "@/lib/geometry";
import { mix } from "@/lib/glass";

export type Craft = "mosaic" | "tapestry" | "vase";

type Paint = (g: CanvasRenderingContext2D, w: number, h: number, palette: string[], rand: () => number) => void;

/** The room: a dark warm wall, a lamp's glow from above, the corners falling into shadow. */
function room(g: CanvasRenderingContext2D, w: number, h: number) {
  g.fillStyle = "#17110d";
  g.fillRect(0, 0, w, h);
  const glow = g.createRadialGradient(w * 0.45, h * 0.28, 0, w * 0.45, h * 0.28, w * 0.95);
  glow.addColorStop(0, "rgba(255,196,130,0.22)");
  glow.addColorStop(1, "rgba(255,196,130,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
}

/** The lamp's light on the piece itself: warm from the upper left, darker toward the edges. */
function light(g: CanvasRenderingContext2D, w: number, h: number) {
  g.save();
  g.globalCompositeOperation = "soft-light";
  const warm = g.createLinearGradient(0, 0, w, h);
  warm.addColorStop(0, "rgba(255,214,160,0.55)");
  warm.addColorStop(1, "rgba(40,20,10,0.35)");
  g.fillStyle = warm;
  g.fillRect(0, 0, w, h);
  g.restore();
  const vignette = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = vignette;
  g.fillRect(0, 0, w, h);
}

/** Glass tesserae set in dark grout: a medallion in the month's colors on a cream field, each tile catching the light on one edge. */
const mosaic: Paint = (g, w, h, palette, rand) => {
  room(g, w, h);
  const [x0, y0, x1, y1] = [w * 0.1, h * 0.08, w * 0.9, h * 0.92];
  g.save();
  g.beginPath();
  g.roundRect(x0, y0, x1 - x0, y1 - y0, 10);
  g.clip();
  g.fillStyle = "#2a221c";
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  const [cx, cy] = [w / 2, h * 0.5];
  const field = ["#e9dcc0", "#e2d2b2", "#efe3c9", "#dccbab"];
  const row = h * 0.046;
  for (let y = y0 + 2; y < y1; y += row) {
    let x = x0 + 2 - rand() * row * 0.6;
    while (x < x1) {
      const tw = row * (0.75 + rand() * 0.5);
      const [mx, my] = [x + tw / 2, y + row / 2];
      // Rings of color round the middle, the field in pale stone.
      const r = Math.hypot((mx - cx) / (w * 0.34), (my - cy) / (w * 0.34));
      // Rings of color round a gold-amber heart, in the month's palette.
      const base = r < 1 ? palette[Math.min(palette.length - 1, Math.floor(r * 5))] : field[Math.floor(rand() * field.length)];
      const c = mix(base, (rand() - 0.5) * 0.14);
      const j = () => (rand() - 0.5) * 1.1;
      const [ax, ay, bx, by] = [x + 0.8 + j(), y + 0.8 + j(), x + tw - 0.8 + j(), y + row - 0.8 + j()];
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, ay + j());
      g.lineTo(bx + j(), by);
      g.lineTo(ax + j(), by);
      g.closePath();
      g.fill();
      // The bevel: light on the top edge, shadow on the bottom.
      g.strokeStyle = "rgba(255,240,215,0.35)";
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ax + 0.5, ay + 0.5);
      g.lineTo(bx - 0.5, ay + 0.5);
      g.stroke();
      g.strokeStyle = "rgba(0,0,0,0.35)";
      g.beginPath();
      g.moveTo(ax + 0.5, by - 0.5);
      g.lineTo(bx - 0.5, by - 0.5);
      g.stroke();
      // Now and then, glass catches the lamp.
      if (rand() < 0.08) {
        g.fillStyle = "rgba(255,248,230,0.8)";
        g.beginPath();
        g.arc(ax + (bx - ax) * 0.3, ay + 2, 0.9, 0, Math.PI * 2);
        g.fill();
      }
      x += tw;
    }
  }
  g.restore();
  g.strokeStyle = "#4a3a2c";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(x0, y0, x1 - x0, y1 - y0, 10);
  g.stroke();
  light(g, w, h);
};

/** A woven hanging: weft rows in a kilim pattern of the month's colors, soft folds, a wooden rod and a fringe. */
const tapestry: Paint = (g, w, h, palette, rand) => {
  room(g, w, h);
  const [x0, x1, top, bottom] = [w * 0.17, w * 0.83, h * 0.12, h * 0.8];
  // Its shadow on the wall, for depth.
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.filter = "blur(8px)";
  g.fillRect(x0 + 8, top + 8, x1 - x0, bottom - top);
  g.filter = "none";
  const cell = w * 0.022;
  const cols = Math.ceil((x1 - x0) / cell);
  const rows = Math.ceil((bottom - top) / cell);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const [x, y] = [x0 + c * cell, top + r * cell];
      // Kilim: a deep field, stepped diamonds down the middle, stripes at the top and bottom.
      const edge = Math.min(r, rows - 1 - r);
      const step = (v: number) => Math.round(v / 2) * 2;
      const d = step(Math.abs(c - cols / 2)) + step(Math.abs((r % 18) - 9));
      const ring = d < 3 ? 0 : d < 6 ? 1 : d < 9 ? 2 : d < 11 ? 3 : -1;
      const field = mix(palette[2 % palette.length], -0.35);
      const color =
        edge < 2 ? "#e6d6b6" : edge < 4 ? palette[0] : edge < 5 ? "#e6d6b6" : ring === -1 ? field : ring === 3 ? "#e6d6b6" : palette[(ring * 2 + Math.floor(r / 18)) % palette.length];
      g.fillStyle = mix(color, (rand() - 0.5) * 0.08);
      g.fillRect(x, y, cell + 0.5, cell + 0.5);
      // The weave: a highlight where the thread goes over, a shadow where it goes under.
      g.fillStyle = (r + c) % 2 ? "rgba(255,240,220,0.16)" : "rgba(0,0,0,0.14)";
      g.fillRect(x, y + cell * 0.15, cell, cell * 0.35);
    }
  // Folds: soft vertical light and shadow.
  for (let x = x0; x < x1; x += 2) {
    const s = Math.sin((x - x0) * 0.045) * 0.5 + Math.sin((x - x0) * 0.11) * 0.2;
    g.fillStyle = s > 0 ? `rgba(255,236,210,${s * 0.14})` : `rgba(0,0,0,${-s * 0.3})`;
    g.fillRect(x, top, 2, bottom - top);
  }
  // The fringe.
  for (let x = x0 + 3; x < x1 - 2; x += 4.5) {
    g.strokeStyle = mix(palette[Math.floor(rand() * palette.length)], 0.25);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(x, bottom);
    g.quadraticCurveTo(x + (rand() - 0.5) * 4, bottom + h * 0.04, x + (rand() - 0.5) * 6, bottom + h * 0.075);
    g.stroke();
  }
  // The rod, in turned wood.
  const rod = g.createLinearGradient(0, top - 9, 0, top + 2);
  rod.addColorStop(0, "#a0754a");
  rod.addColorStop(0.5, "#6b4527");
  rod.addColorStop(1, "#3a2414");
  g.fillStyle = rod;
  g.beginPath();
  g.roundRect(x0 - 16, top - 9, x1 - x0 + 32, 10, 5);
  g.fill();
  light(g, w, h);
};

/** A glazed vase on a shelf: painted bands that follow its curve, its glaze catching the lamp. */
const vase: Paint = (g, w, h, palette, rand) => {
  room(g, w, h);
  const cx = w / 2;
  const shelf = h * 0.86;
  // The shelf, and the vase's shadow on it.
  const wood = g.createLinearGradient(0, shelf, 0, shelf + h * 0.06);
  wood.addColorStop(0, "#6e4729");
  wood.addColorStop(1, "#2e1c10");
  g.fillStyle = wood;
  g.fillRect(0, shelf, w, h * 0.06);
  g.fillStyle = "rgba(255,210,160,0.25)";
  g.fillRect(0, shelf, w, 1.5);
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.filter = "blur(6px)";
  g.beginPath();
  g.ellipse(cx + 10, shelf + 2, w * 0.24, h * 0.018, 0, 0, Math.PI * 2);
  g.fill();
  g.filter = "none";

  // The body: a narrow neck with a lip, a full shoulder, tapering to its foot.
  const body = new Path2D();
  const neck = h * 0.22;
  const half = (y: number) => {
    if (y <= neck) return w * 0.075;
    const t = (y - neck) / (shelf - neck);
    // Swelling out to the shoulder, then easing in to the foot.
    return t < 0.35 ? w * (0.075 + 0.235 * Math.sin(((t / 0.35) * Math.PI) / 2)) : w * (0.13 + 0.18 * Math.cos((((t - 0.35) / 0.65) * Math.PI) / 2));
  };
  const steps = 60;
  const ys = Array.from({ length: steps + 1 }, (_, i) => h * 0.16 + ((shelf - h * 0.16) * i) / steps);
  body.moveTo(cx - w * 0.1, h * 0.14);
  body.lineTo(cx + w * 0.1, h * 0.14);
  ys.forEach((y) => body.lineTo(cx + Math.max(half(y), w * 0.075), y));
  [...ys].reverse().forEach((y) => body.lineTo(cx - Math.max(half(y), w * 0.075), y));
  body.closePath();

  g.save();
  g.clip(body);
  g.fillStyle = "#efe4d0";
  g.fillRect(0, 0, w, h);
  // Painted bands, curving round the body as seen from a little above.
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const y = h * 0.25 + ((shelf - h * 0.3) * i) / bands;
    const hw = Math.max(half(y), w * 0.075);
    g.fillStyle = mix(palette[i % palette.length], (rand() - 0.5) * 0.1);
    g.beginPath();
    for (let k = 0; k <= 40; k++) {
      const x = -hw + (2 * hw * k) / 40;
      const dip = Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) * h * 0.012;
      if (k) g.lineTo(cx + x, y + dip);
      else g.moveTo(cx + x, y + dip);
    }
    for (let k = 40; k >= 0; k--) {
      const x = -hw + (2 * hw * k) / 40;
      const dip = Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) * h * 0.012;
      g.lineTo(cx + x, y + dip + h * 0.022);
    }
    g.fill();
    // A row of painted dots on every other band.
    if (i % 3 === 1) {
      g.fillStyle = "#efe4d0";
      for (let x = -hw * 0.9; x < hw * 0.9; x += w * 0.035) {
        const dip = Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) * h * 0.012;
        g.beginPath();
        g.arc(cx + x, y + dip + h * 0.011, w * 0.006, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // Its roundness: light from the left, shadow to the right.
  const round = g.createLinearGradient(cx - w * 0.3, 0, cx + w * 0.3, 0);
  round.addColorStop(0, "rgba(255,236,205,0.35)");
  round.addColorStop(0.35, "rgba(255,236,205,0)");
  round.addColorStop(0.7, "rgba(20,10,5,0.25)");
  round.addColorStop(1, "rgba(20,10,5,0.65)");
  g.fillStyle = round;
  g.fillRect(0, 0, w, h);
  // The glaze catching the lamp.
  g.filter = "blur(5px)";
  g.fillStyle = "rgba(255,250,240,0.55)";
  g.beginPath();
  g.ellipse(cx - w * 0.15, h * 0.48, w * 0.025, h * 0.16, 0.05, 0, Math.PI * 2);
  g.fill();
  g.filter = "none";
  g.restore();
  // The mouth.
  g.fillStyle = "#3a2a20";
  g.beginPath();
  g.ellipse(cx, h * 0.14, w * 0.1, h * 0.014, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#e9dcc6";
  g.lineWidth = 2;
  g.stroke();
  light(g, w, h);
};

const PAINT: Record<Craft, Paint> = { mosaic, tapestry, vase };

export default function CraftPreview({ craft, palette, label }: { craft: Craft; palette: string[]; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const [w, h] = [c.clientWidth, c.clientHeight];
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext("2d")!;
    g.scale(dpr, dpr);
    PAINT[craft](g, w, h, palette, seeded(`craft:${craft}`));
  }, [craft, palette]);
  return <canvas ref={ref} role="img" aria-label={label} className="block aspect-[3/4] w-full rounded-xl" />;
}
