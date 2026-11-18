// The month's window, flat (SVG), from the same data as the 3D one (lib/window-model).
// It's the fallback when a phone can't run WebGL.

import { useId } from "react";
import { toPath, type Pt } from "@/lib/geometry";
import type { WindowModel } from "@/lib/window-model";

const U = 100; // svg units per scene unit
const flip = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x * U, -y * U]);

export default function FlatWindow({ model, label }: { model: WindowModel; label?: string }) {
  const w = model.width * U;
  const h = model.height * U;
  // Mended lead: bands of light and dark, the way polished gold shows a room (as in the month row).
  const gold = useId();
  return (
    <svg viewBox={`${-w / 2 - 12} ${-h / 2 - 12} ${w + 24} ${h + 24}`} className="h-auto w-full" role={label ? "img" : undefined} aria-label={label}>
      <defs>
        <linearGradient id={gold} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor="#fff4cc" />
          <stop offset="0.22" stopColor="#f2c95e" />
          <stop offset="0.45" stopColor="#9e6716" />
          <stop offset="0.62" stopColor="#f6d77f" />
          <stop offset="0.8" stopColor="#c38d2c" />
          <stop offset="1" stopColor="#6e4610" />
        </linearGradient>
      </defs>
      <path d={toPath(flip(model.outline))} fill="#2b1c12" stroke="#3b2618" strokeWidth="18" strokeLinejoin="round" />
      {model.panes.map((p) => (
        <path
          key={p.key}
          d={toPath(flip(p.points))}
          fill={p.color}
          stroke={p.mended ? `url(#${gold})` : "#1a120d"}
          strokeWidth={p.mended ? 3.5 : 2}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
