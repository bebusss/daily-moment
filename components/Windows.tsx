"use client";

// Your windows: every month's window on one wall, and next month's still to choose. Tapping the
// month at the top opens it.
//
// - The months before stay exactly as they were (missed nights clear, mended in gold), each in
//   the design it had. This month's is in progress.
// - A new window every month is free, from the house rotation. Choosing your own is where the
//   paid tier (Plus) goes. The nightly ritual and the record of your nights are never behind it.

import { useMemo, useState, type ReactNode } from "react";
import FlatWindow from "@/components/FlatWindow";
import { finishedMonth, monthName, type DailyGoal } from "@/lib/data";
import { DESIGNS } from "@/lib/designs";
import { buildWindow, nightLooks } from "@/lib/window-model";

type Choice = { id: string; name: string; plus: boolean; art: ReactNode };

/** Next month's windows: the house window is free, choosing another is Plus. */
const CHOICES: Choice[] = [
  {
    id: "nouveau",
    name: "Nouveau",
    plus: false,
    art: (
      <>
        <path d="M6 70V30Q6 8 24 8t18 22v40Z" />
        <path d="M14 70c0-16 16-18 10-34-3-8 2-14 10-14" />
        <path d="M34 70c0-10-10-14-8-24" />
        <path d="M24 36c-6-2-10-8-8-14 6 0 10 6 8 14Z" />
      </>
    ),
  },
  {
    id: "rose",
    name: "Rose",
    plus: true,
    art: (
      <>
        <path d="M6 70V30Q6 8 24 8t18 22v40Z" />
        <circle cx="24" cy="44" r="13" />
        <circle cx="24" cy="44" r="4" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <path key={i} d={`M${24 + Math.cos(a) * 4} ${44 + Math.sin(a) * 4}L${24 + Math.cos(a) * 13} ${44 + Math.sin(a) * 13}`} />;
        })}
      </>
    ),
  },
  {
    id: "sunburst",
    name: "Sunburst",
    plus: true,
    art: (
      <>
        <path d="M6 70V30Q6 8 24 8t18 22v40Z" />
        <path d="M14 70a10 10 0 0 1 20 0" />
        <path d="M24 60V14M24 60 9 28M24 60l15-32M24 60 6 48M24 60l18-12" />
      </>
    ),
  },
  {
    id: "vine",
    name: "Vine",
    plus: true,
    art: (
      <>
        <path d="M6 70V30Q6 8 24 8t18 22v40Z" />
        <path d="M24 70c-4-14 4-26 0-40-1-5 1-10 2-14" />
        <path d="M23 58c-6-1-10-5-10-10 6 0 10 4 10 10ZM25 46c6-1 10-5 10-10-6 0-10 4-10 10ZM23 34c-5-1-8-5-8-9 5 0 8 4 8 9Z" />
      </>
    ),
  },
];

type Props = { goal: DailyGoal; shown: string; onOpen: (month: string) => void; onClose: () => void };

export default function Windows({ goal, shown: showing, onOpen, onClose }: Props) {
  const next = monthName(goal.month, 1);
  // The wall: the months before, this month, and next month's (still to choose).
  const wall = useMemo(
    () =>
      [...goal.past.map((p) => finishedMonth(goal, p)), goal].map((g) => {
        const looks = nightLooks(g);
        return {
          goal: g,
          model: buildWindow(g),
          done: g.nights.filter((n) => n.done).length,
          nights: g.month === goal.month ? g.nights.length : looks.length,
          mended: looks.filter((l) => l.mended).length,
        };
      }),
    [goal],
  );
  const [open, setOpen] = useState<string>(showing);
  const [picked, setPicked] = useState(CHOICES[0].id);
  const [asked, setAsked] = useState(false);
  const shown = wall.find((w) => w.goal.month === open);
  const plus = CHOICES.find((d) => d.id === picked)?.plus;

  return (
    <div role="dialog" aria-modal aria-label="Your windows" className="fixed inset-0 z-20 flex items-end animate-fade [animation-duration:0.3s]">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-night/60 backdrop-blur-[2px]" />
      <section className="card relative mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] max-h-[88dvh] bg-night-2! w-[calc(100%-1.5rem)] max-w-[420px] animate-rise overflow-y-auto">
        <p className="eyebrow">Your windows</p>

        <div className="mt-4 grid grid-cols-4 items-end gap-2.5" role="group" aria-label="Your windows, month by month">
          {wall.map((w) => (
            <button
              key={w.goal.month}
              onClick={() => setOpen(w.goal.month)}
              aria-pressed={open === w.goal.month}
              aria-label={`${monthName(w.goal.month)}: ${w.done} of ${w.nights} nights`}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 pb-2 transition-colors duration-200 ${open === w.goal.month ? "bg-white/8 ring-1 ring-white/15" : ""}`}
            >
              <FlatWindow model={w.model} />
              <span className="text-xs text-ink">{monthName(w.goal.month).slice(0, 3)}</span>
            </button>
          ))}
          <button
            onClick={() => setOpen("next")}
            aria-pressed={open === "next"}
            aria-label={`${next}'s window: choose it`}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-1.5 pb-2 transition-colors duration-200 ${open === "next" ? "bg-gold/10 ring-1 ring-gold/50" : ""}`}
          >
            <svg viewBox="0 0 48 124" className="w-full text-gold/70" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" aria-hidden>
              <path d="M3 121V48Q3 6 24 3q21 3 21 45v73Z" />
            </svg>
            <span className="text-xs text-gold">{next.slice(0, 3)}</span>
          </button>
        </div>

        {shown ? (
          <div key={open} className="mt-5 animate-rise">
            <p className="eyebrow">
              {monthName(shown.goal.month)} · {DESIGNS[shown.goal.design].name}
            </p>
            <h2 className="mt-1 font-display text-2xl leading-snug">{shown.goal.intention}</h2>
            <p className="mt-2 text-sm text-ink">
              {shown.done} of {shown.nights} nights{shown.goal.month === goal.month ? " so far" : ""}
            </p>
            {shown.mended > 0 && (
              <p className="mt-1 flex items-center gap-2 text-sm text-gold">
                <span aria-hidden className="h-0.5 w-4 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
                {shown.mended} mended
              </p>
            )}
            {shown.goal.month !== showing && (
              <button onClick={() => onOpen(shown.goal.month)} className="btn-quiet mt-5 mb-1">
                {shown.goal.month === goal.month ? "Back to tonight" : `Open ${monthName(shown.goal.month)}`}
              </button>
            )}
          </div>
        ) : (
          <div key="next" className="mt-5 animate-rise">
            <p className="eyebrow">Next month</p>
            <h2 className="mt-1 font-display text-2xl">{next}&apos;s window</h2>
            <p className="mt-1 text-sm text-mist">A new window every month. Choose your own with Plus.</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {CHOICES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setPicked(d.id);
                    setAsked(false);
                  }}
                  aria-pressed={picked === d.id}
                  className={`flex flex-col items-center gap-2 rounded-2xl pt-3 pb-2.5 ring-1 transition-colors duration-200 ${
                    picked === d.id ? "bg-gold/10 text-gold ring-gold/50" : "bg-white/4 text-mist ring-white/8"
                  }`}
                >
                  <svg viewBox="0 0 48 76" className="h-14 w-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
                    {d.art}
                  </svg>
                  <span className="text-xs text-ink">{d.name}</span>
                  <span className={`text-[10px] tracking-[0.14em] uppercase ${d.plus ? "text-gold" : "text-mist"}`}>{d.plus ? "Plus" : "Free"}</span>
                </button>
              ))}
            </div>
            {plus ? (
              <>
                <button onClick={() => setAsked(true)} className="btn-primary mt-5">
                  Choose with Plus
                </button>
                <p className="mt-2 h-4 text-center text-xs text-mist">{asked && "No payments in this prototype."}</p>
              </>
            ) : (
              <button onClick={onClose} className="btn-quiet mt-5 mb-6">
                Keep {CHOICES.find((d) => d.id === picked)?.name}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
