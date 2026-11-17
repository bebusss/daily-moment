// The month's window, flat (SVG): the fallback when a phone can't run WebGL.
// Same data as the 3D window (lib/window-model), drawn as paths.

import { toPath } from "@/lib/geometry";
import type { WindowModel } from "@/lib/window-model";

const M = 22;

export default function RoseWindow({ model, label }: { model: WindowModel; label: string }) {
  const R = model.radius;
  return (
    <svg viewBox={`${-M} ${-M} ${2 * (R + M)} ${2 * (R + M)}`} className="h-auto w-full" role="img" aria-label={label}>
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9dd92" />
          <stop offset="50%" stopColor="#d79c30" />
          <stop offset="100%" stopColor="#f5cf72" />
        </linearGradient>
      </defs>
      <circle cx={R} cy={R} r={R + 10} fill="var(--color-stone)" />
      {model.panes.map((p) => p.shards.map((s, i) => <path key={`${p.day}-${i}`} d={toPath(s.points)} fill={s.color} fillOpacity={s.opacity} />))}
      {model.panes.map((p) =>
        p.shards.map((s, i) => <path key={`${p.day}-${i}`} d={toPath(s.points)} fill="none" stroke="var(--color-lead)" strokeWidth="1.1" />),
      )}
      {model.panes.map((p) => (
        <path key={p.day} d={toPath(p.outline)} fill="none" stroke="var(--color-lead)" strokeWidth="3" strokeLinejoin="round" />
      ))}
      {model.rings.map((r) => (
        <circle key={r} cx={R} cy={R} r={r} fill="none" stroke="var(--color-stone)" strokeWidth="4" />
      ))}
      {model.panes
        .filter((p) => p.status === "today")
        .map((p) => (
          <path key={p.day} d={toPath(p.outline)} fill="none" stroke="#f1ebdd" strokeOpacity="0.75" strokeWidth="1.3" strokeDasharray="3 4" />
        ))}
      {model.panes
        .filter((p) => p.mended)
        .map((p) => (
          <path key={p.day} d={toPath(p.outline)} fill="none" stroke="url(#gold)" strokeWidth="3.2" strokeLinejoin="round" />
        ))}
      <circle cx={R} cy={R} r={R} fill="none" stroke="var(--color-lead)" strokeWidth="4" />
    </svg>
  );
}
