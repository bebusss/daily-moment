// The month's window, flat (SVG), from the same data as the 3D one (lib/window-model).
// Two uses: the fallback when a phone can't run WebGL, and ("light") the colored
// light the window casts across the screen, drawn without its leads and then blurred.

import { toPath, type Pt } from "@/lib/geometry";
import type { WindowModel } from "@/lib/window-model";

const U = 100; // svg units per scene unit
const flip = (pts: Pt[]): Pt[] => pts.map(([x, y]) => [x * U, -y * U]);

export default function FlatWindow({ model, label, light = false }: { model: WindowModel; label?: string; light?: boolean }) {
  const w = model.width * U;
  const h = model.height * U;
  return (
    <svg
      viewBox={`${-w / 2 - 12} ${-h / 2 - 12} ${w + 24} ${h + 24}`}
      className="h-auto w-full"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {!light && <path d={toPath(flip(model.outline))} fill="#2b1c12" stroke="#3b2618" strokeWidth="24" strokeLinejoin="round" />}
      {model.panes.map((p) => (
        <path
          key={p.key}
          d={toPath(flip(p.points))}
          fill={p.color}
          fillOpacity={light && (p.status === "future" || p.status === "spare" || p.status === "today") ? 0.15 : 1}
          stroke={light ? "none" : p.mended ? "#e7b24f" : "#1a120d"}
          strokeWidth={p.mended ? 5 : 3}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
