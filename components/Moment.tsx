"use client";

// The daily moment's state: the month's nights, which night is open, and whether
// tonight's wind-down is running. The window (WindowScene) only draws what it's given;
// everything the person reads and touches sits on top of it: the month and intention
// above, and one card below with the month's row of nights and the open night.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import MonthStrip from "@/components/MonthStrip";
import NightCard from "@/components/NightCard";
import Ritual from "@/components/Ritual";
import Windows from "@/components/Windows";
import { dayOf, monthName, type DailyGoal, type LineKind, type Weight } from "@/lib/data";
import { useSunset } from "@/lib/sunset";
import { nightLooks } from "@/lib/window-model";

// The 3D window (three.js and its effects, most of the page's code) loads on its own, after the
// screen around it already responds; it fades in when it's ready.
const WindowScene = dynamic(() => import("@/components/WindowScene"), { ssr: false });

/** How much of the screen the text above and the card below cover, so the window fits between them. */
function useInsets() {
  const top = useRef<HTMLElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const [insets, setInsets] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    const measure = () => {
      const t = top.current?.getBoundingClientRect();
      const b = bottom.current?.getBoundingClientRect();
      if (t && b) setInsets({ top: Math.round(t.bottom), bottom: Math.round(window.innerHeight - b.top) });
    };
    const observer = new ResizeObserver(measure);
    if (top.current) observer.observe(top.current);
    if (bottom.current) observer.observe(bottom.current);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return { top, bottom, insets };
}

export default function Moment({ initial }: { initial: DailyGoal }) {
  const [goal, setGoal] = useState(initial);
  const today = dayOf(goal.today);
  const [selected, setSelected] = useState(today);
  const [ritual, setRitual] = useState(false);
  const [windows, setWindows] = useState(false);
  // Just after tonight's leaf is set, the window comes to it while it fills in, then steps back.
  const [settling, setSettling] = useState(false);
  const sunset = useSunset();
  const { top, bottom, insets } = useInsets();
  const looks = useMemo(() => nightLooks(goal), [goal]);
  // When the screen first responds to taps (DevTools > Performance, or performance.getEntriesByName).
  useEffect(() => void performance.mark("ui:ready"), []);

  const done = goal.nights.filter((n) => n.done).length;
  const label = `${goal.intention}: this month's window, ${done} of ${goal.nights.length} nights so far`;
  const select = (day: number) => day <= today && setSelected(day);

  /** Tonight's leaf is set: the window gets a new night and fills it in. */
  function setTonight(weight: Weight, note: string, line: LineKind) {
    setGoal((g) => ({ ...g, nights: [...g.nights, { date: g.today, done: true, weight, ...(note ? { note, line } : {}) }] }));
    setSelected(today);
    setRitual(false);
    setSettling(true);
    setTimeout(() => setSettling(false), 4200);
  }

  /** The night the window brings forward: a past night that's open, or tonight's leaf as it's set. */
  const spotlight = selected !== today ? selected : settling ? today : null;

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <WindowScene goal={goal} label={label} selected={selected} spotlight={spotlight} onSelect={select} insets={insets} paused={ritual} />

      <header
        ref={top}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 text-center before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[calc(100%+2.5rem)] before:bg-gradient-to-b before:from-night/90 before:via-night/60 before:to-transparent"
      >
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
        <h1 className="mt-0.5 font-display text-[26px] leading-tight text-ink">{goal.intention}</h1>
        <p className="mt-1 h-4 text-xs text-mist">
          {sunset && (
            <span className="animate-fade">
              Sunset {sunset.time} · {sunset.place}
            </span>
          )}
        </p>
      </header>

      <div ref={bottom} className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <section className="card overflow-hidden p-0">
          <MonthStrip month={goal.month} nights={looks} selected={selected} onSelect={select} />
          <div className="border-t border-white/6">
            <NightCard key={`${selected}-${goal.nights.length}`} goal={goal} day={selected} onBegin={() => setRitual(true)} onBack={() => setSelected(today)} />
          </div>
        </section>
      </div>

      {ritual && <Ritual goal={goal} onClose={() => setRitual(false)} onDone={setTonight} />}
      {windows && <Windows goal={goal} onClose={() => setWindows(false)} />}
    </main>
  );
}
