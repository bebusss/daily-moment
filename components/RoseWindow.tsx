// The month as a rose window. Each night is a pane:
// - a night done is colored glass, deeper the heavier the day was;
// - a night missed stays clear glass (light still passes through);
// - when you come back after a miss, the lead around that clear pane turns gold
//   (a mending lead: old cathedral windows were repaired with an extra strip of lead,
//   and the repairs stay visible for centuries);
// - tonight's pane waits with a faint outline; the rest of the month is unlit glass.

import type { DailyGoal, Weight } from "@/lib/data";
import { seeded } from "@/lib/geometry";
import { paneColors, shardColors } from "@/lib/glass";
import { RADII, roseWindow } from "@/lib/rose";

type Status = "done" | "gap" | "today" | "future";

/** The window's radius, and the room left around it for its glow. */
const R = 160;
const M = 22;

const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export default function RoseWindow({ goal }: { goal: DailyGoal }) {
  const days = daysIn(goal.month);
  const today = Number(goal.today.slice(8, 10));
  const colors = paneColors(goal.palette, days, goal.month);
  const panes = roseWindow(days, R, goal.month);

  const night = (day: number) => goal.nights[day - 1];
  const status = (day: number): Status =>
    day === today ? "today" : day > today ? "future" : night(day)?.done ? "done" : "gap";
  // A missed night is mended once any later night (before tonight) was done.
  const mended = (day: number) => status(day) === "gap" && goal.nights.slice(day).some((n) => n.done);

  /** The fill of every shard of a pane. */
  const fills = (day: number, count: number): string[] => {
    const s = status(day);
    if (s === "done") return shardColors(colors[day - 1], (night(day)?.weight ?? 2) as Weight, count, `${goal.month}:${day}`);
    const rand = seeded(`${goal.month}:${day}:${s}`);
    if (s === "gap") return Array.from({ length: count }, () => `rgba(226, 235, 248, ${(0.42 + rand() * 0.24).toFixed(2)})`);
    if (s === "today") return Array.from({ length: count }, () => "#141c31");
    return Array.from({ length: count }, () => (rand() > 0.5 ? "#0a0e19" : "#0c111d"));
  };

  const lit = panes.filter(({ day }) => status(day) === "done" || status(day) === "gap");

  return (
    <svg viewBox={`${-M} ${-M} ${2 * (R + M)} ${2 * (R + M)}`} className="h-auto w-full" role="img" aria-label={`${goal.intention}: this month's window`}>
      <defs>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="#8796d6" stopOpacity="0.5" />
          <stop offset="65%" stopColor="#3b4a86" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#0a0e18" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="light">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {/* Every shard is a little domed: brighter in its middle, darker at its edges, like real hand-blown glass. */}
        <radialGradient id="dome" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.35" />
        </radialGradient>
        <radialGradient id="sheen" cx="32%" cy="24%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f9dd92" />
          <stop offset="50%" stopColor="#d79c30" />
          <stop offset="100%" stopColor="#f5cf72" />
        </linearGradient>
        <filter id="bloom" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="halo-blur" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="gold-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="glow" />
          <feMerge>
            <feMergeNode in="glow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="window">
          <circle cx={R} cy={R} r={R} />
        </clipPath>
      </defs>

      {/* Moonlight behind the window, and its stone frame. */}
      <circle cx={R} cy={R} r={R + M} fill="url(#halo)" filter="url(#halo-blur)" />
      <circle cx={R} cy={R} r={R + 10} fill="var(--color-stone)" />

      {/* Lit glass spills a little light onto the stone around it. */}
      <g filter="url(#bloom)" opacity="0.7">
        {lit.map(({ day, outline }) => (
          <path key={day} d={outline} fill={fills(day, 1)[0]} />
        ))}
      </g>

      {/* The glass, shard by shard. */}
      {panes.map(({ day, shards }) => {
        const f = fills(day, shards.length);
        return shards.map((d, i) => <path key={`${day}-${i}`} d={d} fill={f[i]} />);
      })}

      {/* Each lit or clear shard catches the light. */}
      {panes
        .filter(({ day }) => status(day) === "done" || status(day) === "gap")
        .map(({ day, shards }) => shards.map((d, i) => <path key={`dome-${day}-${i}`} d={d} fill="url(#dome)" />))}

      {/* Light through the glass, a soft sheen, and its texture. */}
      <g clipPath="url(#window)">
        <circle cx={R} cy={R} r={R} fill="url(#light)" style={{ mixBlendMode: "screen" }} />
        <circle cx={R} cy={R} r={R} fill="url(#sheen)" />
        <rect x={0} y={0} width={2 * R} height={2 * R} filter="url(#grain)" opacity="0.07" style={{ mixBlendMode: "overlay" }} />
      </g>

      {/* Thin leads between shards, heavier leads between nights, stone between the rings. */}
      {panes.map(({ day, shards }) =>
        shards.map((d, i) => <path key={`${day}-${i}`} d={d} fill="none" stroke="var(--color-lead)" strokeWidth="1.1" strokeLinejoin="round" />),
      )}
      {panes.map(({ day, outline }) => (
        <path key={day} d={outline} fill="none" stroke="var(--color-lead)" strokeWidth="3" strokeLinejoin="round" />
      ))}
      {RADII.slice(1, -1).map((f) => (
        <circle key={f} cx={R} cy={R} r={f * R} fill="none" stroke="var(--color-stone)" strokeWidth="4" />
      ))}

      {/* Tonight's pane, waiting. */}
      {panes
        .filter(({ day }) => status(day) === "today")
        .map(({ day, outline }) => (
          <path key={day} d={outline} fill="none" stroke="#f1ebdd" strokeOpacity="0.75" strokeWidth="1.3" strokeDasharray="3 4" />
        ))}

      {/* Gold mending leads around the nights you came back from. */}
      {panes
        .filter(({ day }) => mended(day))
        .map(({ day, outline }) => (
          <path key={day} d={outline} fill="none" stroke="url(#gold)" strokeWidth="3.2" strokeLinejoin="round" filter="url(#gold-glow)" />
        ))}

      <circle cx={R} cy={R} r={R} fill="none" stroke="var(--color-lead)" strokeWidth="4" />
      <circle cx={R} cy={R} r={R + 10} fill="none" stroke="#2a3142" strokeWidth="1.5" />
    </svg>
  );
}
