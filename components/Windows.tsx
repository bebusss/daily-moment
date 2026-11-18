"use client";

// Your windows: every month's window on one wall, and next month's still to choose. Tapping the
// month at the top opens it.
//
// - The months before stay exactly as they were (missed nights clear, mended in gold), each in
//   the design it had. This month's is in progress.
// - Next month's piece is where the paid tier (Plus) goes. Free, it's another window, from the
//   house rotation. With Plus you choose the craft: a mosaic, a tapestry or a kintsugi vase, each
//   with its own way of mending a missed night in gold. (A mock: only the window is built.)
// - The nightly ritual and the record of your nights are never behind it.
//
// Why the window is the free default and kintsugi isn't: kintsugi is the metaphor everyone
// knows. For some people it's poetic, so it's there to choose, but as the default it would feel
// borrowed. The window is this app's own version of the same idea.

import { useMemo, useState, type ReactNode } from "react";
import FlatWindow from "@/components/FlatWindow";
import { finishedMonth, monthName, type DailyGoal } from "@/lib/data";
import { DESIGNS } from "@/lib/designs";
import { buildWindow, nightLooks } from "@/lib/window-model";

type Medium = { id: string; name: string; plus: boolean; how: string; art: ReactNode };

const C = { ruby: "#c9473f", amber: "#e39a35", emerald: "#3f9a5d", sapphire: "#3a78c0", amethyst: "#8457c2", rose: "#d0608c", gold: "#e7b24f", lead: "#1a120d" };
const TONES = [C.ruby, C.amber, C.emerald, C.sapphire, C.amethyst, C.rose];

/** Next month's piece: another window is free; another craft is Plus. Each mends a missed night its own way. */
const MEDIUMS: Medium[] = [
  {
    id: "window",
    name: "Window",
    plus: false,
    how: "A piece of glass a night. A missed night stays clear, and coming back leads it in gold. December's house window is Nouveau.",
    art: (
      <>
        <path d="M6 72V30Q6 6 24 4Q42 6 42 30V72Z" fill={C.lead} />
        <path d="M9 30Q9 9 24 7Q39 9 39 30Z" fill={C.sapphire} />
        {Array.from({ length: 9 }, (_, i) => {
          const [x, y] = [9 + (i % 3) * 10.2, 32.5 + Math.floor(i / 3) * 13];
          const mended = i === 4;
          return <rect key={i} x={x} y={y} width="9.4" height="12" fill={mended ? "#efe8d8" : TONES[(i * 4) % 6]} stroke={mended ? C.gold : C.lead} strokeWidth={mended ? 1.6 : 0.8} />;
        })}
      </>
    ),
  },
  {
    id: "mosaic",
    name: "Mosaic",
    plus: true,
    how: "A tile a night. A missed night stays bare grout, and coming back sets it with a tile of gold.",
    art: (
      <>
        <rect x="4" y="6" width="40" height="66" rx="3" fill="#5c5146" />
        {Array.from({ length: 6 * 10 }, (_, i) => {
          const [col, row] = [i % 6, Math.floor(i / 6)];
          if (i === 27) return null; // bare grout: a night still missed
          return <rect key={i} x={6.2 + col * 6.1} y={8.2 + row * 6.3} width="5.2" height="5.4" rx="0.6" fill={i === 33 ? C.gold : TONES[(i * 7 + row) % 6]} opacity={i === 33 ? 1 : 0.92} />;
        })}
      </>
    ),
  },
  {
    id: "tapestry",
    name: "Tapestry",
    plus: true,
    how: "A row of weave a night. A missed night leaves a gap, and coming back darns it in gold thread, like Japanese boro.",
    art: (
      <>
        <path d="M5 6h38" stroke="#7a5a3a" strokeWidth="2" strokeLinecap="round" />
        {Array.from({ length: 12 }, (_, i) => (
          <rect key={i} x="8" y={8 + i * 4.9} width="32" height="4.9" fill={TONES[(i * 5) % 6]} />
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d={`M${9 + i * 2} 8v58.8`} stroke="#fff" strokeOpacity="0.12" strokeWidth="0.6" />
        ))}
        <rect x="16" y="32.5" width="14" height="9.8" fill="#3b2e24" />
        {Array.from({ length: 6 }, (_, i) => (
          <path key={i} d={`M${16.5 + i * 2.5} 32.8v9.2M16.3 ${33.6 + i * 1.6}h13.4`} stroke={C.gold} strokeWidth="0.8" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${9.5 + i * 3.6} 67v5`} stroke="#c9b28c" strokeWidth="0.9" strokeLinecap="round" />
        ))}
      </>
    ),
  },
  {
    id: "kintsugi",
    name: "Kintsugi",
    plus: true,
    how: "A shard a night, fitted into a bowl. Coming back after a miss joins it with gold.",
    art: (
      <>
        <path d="M17 9h14v3c0 3 9 8 9 24 0 18-7 30-16 34-9-4-16-16-16-34 0-16 9-21 9-24Z" fill="#2f5d73" />
        <path d="M17 9h14v3H17Z" fill="#244a5c" />
        <path d="M24 13l3 9-5 7 6 10-4 9 3 9" fill="none" stroke={C.gold} strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M11 38l7 3 4-3M33 30l-5 5 3 6" fill="none" stroke={C.gold} strokeWidth="1.1" strokeLinejoin="round" />
        <path d="M14 26c3-4 6-6 7-6" fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="1.2" strokeLinecap="round" />
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
            <h2 className="mt-1 font-display text-2xl">{next}&apos;s piece</h2>
            <p className="mt-1 text-sm text-mist">A new window every month, free. With Plus, choose the craft.</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {MEDIUMS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setPicked(d.id);
                    setAsked(false);
                  }}
                  aria-pressed={picked === d.id}
                  className={`flex flex-col items-center gap-2 rounded-2xl pt-3 pb-2.5 ring-1 transition-colors duration-200 ${
                    picked === d.id ? "bg-gold/10 ring-gold/50" : "bg-white/4 ring-white/8"
                  }`}
                >
                  <svg viewBox="0 0 48 76" className="h-16 w-10" aria-hidden>
                    {d.art}
                  </svg>
                  <span className="text-xs text-ink">{d.name}</span>
                  <span className={`text-[10px] tracking-[0.14em] uppercase ${d.plus ? "text-gold" : "text-mist"}`}>{d.plus ? "Plus" : "Free"}</span>
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
