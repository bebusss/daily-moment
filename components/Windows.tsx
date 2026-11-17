"use client";

// Where the paid tier goes. Every month starts a new window; the plain lancet is free
// forever, and Plus unlocks the other window designs. The nightly ritual and the record
// of your nights are never behind it. Tapping the month name at the top opens this.

import { useState, type ReactNode } from "react";
import { monthName, type DailyGoal } from "@/lib/data";

type Design = { id: string; name: string; plus: boolean; art: ReactNode };

const DESIGNS: Design[] = [
  {
    id: "lancet",
    name: "Lancet",
    plus: false,
    art: (
      <>
        <path d="M6 70V28a18 18 0 0 1 36 0v42Z" />
        <path d="M18 70V22M30 70V22M6 42h36M6 56h36M24 10v12" />
      </>
    ),
  },
  {
    id: "rose",
    name: "Rose",
    plus: true,
    art: (
      <>
        <circle cx="24" cy="38" r="20" />
        <circle cx="24" cy="38" r="13" />
        <circle cx="24" cy="38" r="5" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <path key={i} d={`M${24 + Math.cos(a) * 5} ${38 + Math.sin(a) * 5}L${24 + Math.cos(a) * 20} ${38 + Math.sin(a) * 20}`} />;
        })}
      </>
    ),
  },
  {
    id: "nouveau",
    name: "Nouveau",
    plus: true,
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
    id: "deco",
    name: "Deco",
    plus: true,
    art: (
      <>
        <path d="M6 70V24h8v-8h8V8h4v8h8v8h8v46Z" />
        <path d="M24 70 6 38M24 70 14 30M24 70V24M24 70l10-40M24 70l18-32" />
      </>
    ),
  },
];

export default function Windows({ goal, onClose }: { goal: DailyGoal; onClose: () => void }) {
  const next = monthName(goal.month, 1);
  const [picked, setPicked] = useState("lancet");
  const [asked, setAsked] = useState(false);
  const plus = DESIGNS.find((d) => d.id === picked)?.plus;

  return (
    <div role="dialog" aria-modal aria-label={`${next}'s window`} className="fixed inset-0 z-20 flex items-end animate-fade [animation-duration:0.3s]">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-night/60 backdrop-blur-[2px]" />
      <section className="card relative mx-auto mb-[max(1rem,env(safe-area-inset-bottom))] w-[calc(100%-1.5rem)] max-w-[420px] animate-rise">
        <p className="eyebrow">Next month</p>
        <h2 className="mt-1 font-display text-2xl">{next}&apos;s window</h2>
        <p className="mt-1 text-sm text-mist">
          A new window starts on {next.slice(0, 3)} 1. {monthName(goal.month)}&apos;s stays as it is.
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {DESIGNS.map((d) => (
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
              Unlock with Plus
            </button>
            <p className="mt-2 h-4 text-center text-xs text-mist">{asked && "No payments in this prototype."}</p>
          </>
        ) : (
          <button onClick={onClose} className="btn-quiet mt-5 mb-6">
            Keep the lancet
          </button>
        )}
      </section>
    </div>
  );
}
