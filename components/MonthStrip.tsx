"use client";

// The month as a row you can read and tap: one leaf per night, the same glass as its
// leaf in the window (colored, clear with gold lead, tonight lit, the rest still pale).
// The window is the picture; this row is how you find a night in it.

import { useEffect, useRef } from "react";
import { WEIGHTS, dateOf, shortDate } from "@/lib/data";
import type { NightLook } from "@/lib/window-model";

type Props = { month: string; nights: NightLook[]; selected: number; onSelect: (day: number) => void };

const LEAF = "M8 1.2C14.2 6.6 14.4 16.6 8 22.8 1.6 16.6 1.8 6.6 8 1.2Z";

function describe(n: NightLook, month: string) {
  const date = shortDate(dateOf(month, n.day));
  if (n.status === "today") return `Tonight, ${date}`;
  if (n.status === "future") return `${date}, still to come`;
  if (n.status === "done") return `${date}, ${WEIGHTS[n.weight ?? 2].toLowerCase()}`;
  return `${date}, no wind-down${n.mended ? ", mended" : ""}`;
}

export default function MonthStrip({ month, nights, selected, onSelect }: Props) {
  const row = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  // Keep the open night in the middle of the row.
  useEffect(() => {
    const el = row.current?.querySelector<HTMLElement>(`[data-day="${selected}"]`);
    if (!row.current || !el) return;
    row.current.scrollTo({ left: el.offsetLeft - (row.current.clientWidth - el.offsetWidth) / 2, behavior: first.current ? "instant" : "smooth" });
    first.current = false;
  }, [selected]);

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
            <span className={`text-[11px] leading-none tabular-nums ${n.status === "today" ? "font-semibold text-gold" : open ? "text-ink" : future ? "text-mist/40" : "text-mist"}`}>
              {n.day}
            </span>
            <svg viewBox="0 0 16 24" className={`h-6 w-4 ${n.status === "today" ? "animate-glow" : ""}`} aria-hidden>
              {n.status === "done" && (
                <>
                  <path d={LEAF} fill={n.color} stroke="#120d0a" strokeWidth="1.3" />
                  <path d={LEAF} fill="url(#leaf-shine)" />
                  <path d="M8 4.5v15" stroke="#120d0a" strokeOpacity="0.35" strokeWidth="0.9" />
                </>
              )}
              {n.status === "gap" && <path d={LEAF} fill="#f2efe6" fillOpacity="0.14" stroke={n.mended ? "var(--color-gold)" : "#ab9c8b"} strokeWidth={n.mended ? 1.6 : 1} />}
              {n.status === "today" && <path d={LEAF} fill={n.color} stroke="#fff3d6" strokeWidth="1" />}
              {future && <path d={LEAF} fill="#cdd5bd" fillOpacity="0.07" stroke="#f3eadc" strokeOpacity="0.16" strokeWidth="1" />}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
