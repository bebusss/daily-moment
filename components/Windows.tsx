"use client";

// Your windows: every month's window on one wall, and next month's still to choose. Tapping the
// month at the top opens it.
//
// - The months before stay exactly as they were (nights with a drink clear, mended in gold), each in
//   the design it had. This month's is in progress.
// - Next month's piece is where the paid tier (Plus) goes. Free, it's another window, from the
//   house rotation. With Plus you choose the craft: a mosaic, a tapestry or a vase. (A mock: only
//   the window is built.)
// - Each is described only by what you'd expect: a little of it a night. How it mends a night
//   with a drink (gold lead, a gold tile, gold thread, the vase's kintsugi) is never announced: you find
//   it the first time you come back.
// - The nightly ritual and the record of your nights are never behind it.
//
// Why the window is the free default and the vase isn't: its mend is kintsugi, the metaphor
// everyone knows. For some people it's poetic, so it's there to choose, but as the default it
// would feel borrowed. The window is this app's own version of the same idea.

import { useMemo, useState } from "react";
import CraftPicture, { useCraftPictures, type Piece } from "@/components/CraftPreview";
import FlatWindow from "@/components/FlatWindow";
import { finishedMonth, monthName, type DailyGoal } from "@/lib/data";
import { DESIGNS } from "@/lib/designs";
import { buildWindow, nightLooks } from "@/lib/window-model";

type Medium = { id: Piece; name: string; plus: boolean; how: string };

/** Next month's piece: another window is free; another craft is Plus. Described as you'd expect, mends unspoiled. */
const MEDIUMS: Medium[] = [
  { id: "window", name: "Window", plus: false, how: "A piece of glass a night, until the window is full. December's house window is a rose." },
  { id: "mosaic", name: "Mosaic", plus: true, how: "A tile a night, set into a mosaic that fills in over the month." },
  { id: "tapestry", name: "Tapestry", plus: true, how: "A row of weave a night, until the tapestry hangs finished." },
  { id: "vase", name: "Vase", plus: true, how: "A vase you paint a little each night, a band at a time." },
];

/** December's palette for the previews: muted winter jewels (teal, lapis, plum, garnet, ochre, sage). */
const DECEMBER = ["#2c5d6b", "#2a3f7a", "#6b3a5e", "#9a3b38", "#c49040", "#6f8a64"];

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
  // December's crafts, rendered in 3D once the choice is on screen.
  const pictures = useCraftPictures(open === "next" ? goal : null, DECEMBER);
  const [picked, setPicked] = useState(MEDIUMS[0].id);
  const [asked, setAsked] = useState(false);
  const shown = wall.find((w) => w.goal.month === open);
  const medium = MEDIUMS.find((d) => d.id === picked) ?? MEDIUMS[0];

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
              {shown.done} of {shown.nights} nights alcohol-free{shown.goal.month === goal.month ? " so far" : ""}
            </p>
            {shown.mended > 0 && (
              <p className="mt-1 flex items-center gap-2 text-sm text-gold">
                <span aria-hidden className="gold-came" />
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
            <h2 className="mt-1 font-display text-2xl">{next}&apos;s piece</h2>
            <p className="mt-1 text-sm text-mist">A new window every month, free. With Plus, choose the craft.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {MEDIUMS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setPicked(d.id);
                    setAsked(false);
                  }}
                  aria-pressed={picked === d.id}
                  className={`rounded-2xl p-1.5 pb-2.5 ring-1 transition-colors duration-200 ${picked === d.id ? "bg-gold/10 ring-gold/60" : "bg-white/4 ring-white/8"}`}
                >
                  <CraftPicture src={pictures?.[d.id]} label={d.id === "window" ? "December's window, a rose, finished" : `A ${d.name.toLowerCase()}, finished`} />
                  <span className="mt-2 flex items-baseline justify-between px-1.5">
                    <span className="text-sm text-ink">{d.name}</span>
                    <span className={`text-[10px] tracking-[0.14em] uppercase ${d.plus ? "text-gold" : "text-mist"}`}>{d.plus ? "Plus" : "Free"}</span>
                  </span>
                </button>
              ))}
            </div>
            <p key={medium.id} className="mt-3 min-h-10 animate-fade text-sm text-ink">
              {medium.how}
            </p>
            {medium.plus ? (
              <>
                <button onClick={() => setAsked(true)} className="btn-primary mt-4">
                  Unlock {medium.name} with Plus
                </button>
                <p className="mt-2 h-4 text-center text-xs text-mist">{asked && "No payments in this prototype."}</p>
              </>
            ) : (
              <button onClick={onClose} className="btn-quiet mt-4 mb-6">
                Keep the window
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
