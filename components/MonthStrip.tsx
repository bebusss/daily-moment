"use client";

// The month as a row you can read and tap: one piece per night (a leaf, a petal or a ray, as in
// that month's window), the same glass as its piece in the window (colored, clear with gold lead,
// tonight lit, the rest still pale).
// The window is the picture; this row is how you find a night in it.

import { useEffect, useRef } from "react";
import { WEIGHTS, dateOf, shortDate } from "@/lib/data";
import type { DesignName } from "@/lib/data";
import type { NightLook } from "@/lib/window-model";

type Props = { month: string; design: DesignName; nights: NightLook[]; selected: number; onSelect: (day: number) => void };

/** Each night in the row is the same piece as in the month's window: a leaf, a petal or a ray. */
const PIECE: Record<DesignName, { d: string; vein?: string }> = {
  vine: { d: "M8 1.2C14.2 6.6 14.4 16.6 8 22.8 1.6 16.6 1.8 6.6 8 1.2Z", vein: "M8 4.5v15" },
  rose: { d: "M8 1.6C11.6 4.6 14 9.4 14 14.4 14 19.4 11.4 22.8 8 22.8 4.6 22.8 2 19.4 2 14.4 2 9.4 4.4 4.6 8 1.6Z" },
  sunburst: { d: "M8 23 3 2.8Q8 1 13 2.8Z" },
};

function describe(n: NightLook, month: string) {
  const date = shortDate(dateOf(month, n.day));
  if (n.status === "today") return `Tonight, ${date}`;
  if (n.status === "future") return `${date}, still to come`;
  if (n.status === "done") return `${date}, ${WEIGHTS[n.weight ?? 2].toLowerCase()}`;
  return `${date}, no wind-down${n.mended ? ", mended" : ""}`;
}

export default function MonthStrip({ month, design, nights, selected, onSelect }: Props) {
  const { d: LEAF, vein } = PIECE[design];
  const row = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Keep the open night in the middle of the row (a month just opened, with none open, starts at its 1st).
  useEffect(() => {
    const r = row.current;
    if (!r) return;
    const el = r.querySelector<HTMLElement>(`[data-day="${selected}"]`);
    r.scrollTo({ left: el ? el.offsetLeft - (r.clientWidth - el.offsetWidth) / 2 : 0, behavior: first.current ? "instant" : "smooth" });
    first.current = false;
  }, [selected, month]);

  return (
    <div
      ref={row}
      role="group"
      aria-label="This month's nights"
      className="flex snap-x gap-0.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)]"
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <radialGradient id="leaf-shine" cx="0.35" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          {/* Gold came: bands of light and dark the way polished metal shows a room. */}
          <linearGradient id="gold-came" x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor="#fff4cc" />
            <stop offset="0.22" stopColor="#f2c95e" />
            <stop offset="0.45" stopColor="#9e6716" />
            <stop offset="0.62" stopColor="#f6d77f" />
            <stop offset="0.8" stopColor="#c38d2c" />
            <stop offset="1" stopColor="#6e4610" />
          </linearGradient>
        </defs>
      </svg>
      {nights.map((n) => {
        const open = n.day === selected;
        const future = n.status === "future";
        return (
          <button
            key={n.day}
            data-day={n.day}
            disabled={future}
            onClick={() => onSelect(n.day)}
            aria-pressed={open}
            aria-label={describe(n, month)}
            className={`flex w-11 shrink-0 snap-center flex-col items-center gap-1 rounded-xl py-1.5 transition-colors duration-200 ${
              open ? "bg-white/8 ring-1 ring-white/12" : ""
            }`}
          >
            <span
              className={`text-[11px] leading-none tabular-nums ${n.status === "today" ? "font-semibold text-gold" : open ? "text-ink" : future ? "text-mist/40" : "text-mist"}`}
            >
              {n.day}
            </span>
            <svg viewBox="0 0 16 24" className={`h-6 w-4 ${n.status === "today" ? "animate-glow" : n.next ? "animate-glow opacity-70" : ""}`} aria-hidden>
              {n.status === "done" && (
                <>
                  <path d={LEAF} fill={n.color} stroke="#120d0a" strokeWidth="1.3" />
                  <path d={LEAF} fill="url(#leaf-shine)" />
                  {vein && <path d={vein} stroke="#120d0a" strokeOpacity="0.35" strokeWidth="0.9" />}
                </>
              )}
              {n.status === "gap" && !n.mended && <path d={LEAF} fill="#f2efe6" fillOpacity="0.14" stroke="#ab9c8b" strokeWidth="1" />}
              {n.status === "gap" && n.mended && (
                <>
                  {/* Clear glass in a gold came: a dark rim, the gold, a bright line along its crown. */}
                  <path d={LEAF} fill="#f2efe6" fillOpacity="0.16" stroke="#2a1906" strokeWidth="2.7" />
                  <path d={LEAF} fill="url(#leaf-shine)" stroke="url(#gold-came)" strokeWidth="1.9" />
                  <path d={LEAF} fill="none" stroke="#fff6dc" strokeOpacity="0.5" strokeWidth="0.4" />
                </>
              )}
              {n.status === "today" && <path d={LEAF} fill={n.color} stroke="#fff3d6" strokeWidth="1" />}
              {future && (
                <path d={LEAF} fill="#cdd5bd" fillOpacity={n.next ? 0.18 : 0.07} stroke="#f3eadc" strokeOpacity={n.next ? 0.55 : 0.16} strokeWidth="1" />
              )}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
