"use client";

// The daily moment's state: the month's nights, which pane is open, and whether
// tonight's wind-down is running. The window (WindowScene) only draws what it's given;
// everything the person touches on top of it lives here.

import { useState } from "react";
import NightCard from "@/components/NightCard";
import Ritual from "@/components/Ritual";
import WindowScene from "@/components/WindowScene";
import Windows from "@/components/Windows";
import { dayOf, monthName, type DailyGoal, type Weight } from "@/lib/data";
import { useSunset } from "@/lib/sunset";

export default function Moment({ initial }: { initial: DailyGoal }) {
  const [goal, setGoal] = useState(initial);
  const today = dayOf(goal.today);
  const [selected, setSelected] = useState(today);
  const [ritual, setRitual] = useState(false);
  const [windows, setWindows] = useState(false);
  const sunset = useSunset();

  const done = goal.nights.filter((n) => n.done).length;
  const label = `${goal.intention}: this month's window, ${done} of ${goal.nights.length} nights so far`;

  /** Tonight's pane is set: the window gets a new night and fills it in. */
  function setTonight(weight: Weight, note: string) {
    setGoal((g) => ({ ...g, nights: [...g.nights, { date: g.today, done: true, weight, ...(note ? { note } : {}) }] }));
    setSelected(today);
    setRitual(false);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <WindowScene goal={goal} label={label} selected={selected} onSelect={(day: number) => day <= today && setSelected(day)} />

      <header className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-night/85 to-transparent px-6 pt-8 pb-12 text-center">
        <button
          onClick={() => setWindows(true)}
          className="eyebrow pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors hover:text-ink"
          aria-label={`${monthName(goal.month)}: see next month's window`}
        >
          {monthName(goal.month)}
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
            <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="mt-1 font-display text-[26px] leading-tight text-ink">{goal.intention}</h1>
        <p className="mt-1 h-4 text-xs text-mist">
          {sunset && (
            <span className="animate-fade">
              Sunset {sunset.time} · {sunset.place}
            </span>
          )}
        </p>
      </header>

      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <NightCard
          key={selected}
          goal={goal}
          day={selected}
          onBegin={() => setRitual(true)}
          onBack={() => setSelected(today)}
        />
      </div>

      {ritual && <Ritual goal={goal} onClose={() => setRitual(false)} onDone={setTonight} />}
      {windows && <Windows goal={goal} onClose={() => setWindows(false)} />}
    </main>
  );
}
