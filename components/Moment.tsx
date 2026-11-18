"use client";

// The daily moment's state: the month's nights (tonight's kept on this device), which night is
// open, and whether tonight's wind-down is running. The window (WindowScene) only draws what it's given;
// everything the person reads and touches sits on top of it: the month and intention
// above, and one card below with the month's row of nights and the open night.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import MonthStrip from "@/components/MonthStrip";
import NightCard from "@/components/NightCard";
import Ritual from "@/components/Ritual";
import Windows from "@/components/Windows";
import { dayOf, finishedMonth, monthName, type DailyGoal, type DesignName, type LineKind, type Weight } from "@/lib/data";
import { DESIGNS } from "@/lib/designs";
import { useSky } from "@/lib/sky";
import { forgetNight, saveNight, useSavedNight } from "@/lib/tonight";
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

/** ?design=rose|sunburst|vine shows this month in another window design (for demos). */
function useDesignOverride(): DesignName | null {
  const asked = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("design"),
    () => null,
  );
  return asked && asked in DESIGNS ? (asked as DesignName) : null;
}

export default function Moment({ initial }: { initial: DailyGoal }) {
  // Tonight, once set, is kept on this device: a reload shows it set.
  const saved = useSavedNight(initial.today);
  const design = useDesignOverride();
  const goal = useMemo(() => {
    const withTonight = saved && !initial.nights.some((n) => n.date === saved.date) ? { ...initial, nights: [...initial.nights, saved] } : initial;
    return design ? { ...withTonight, design } : withTonight;
  }, [initial, saved, design]);
  const today = dayOf(goal.today);
  // A month before this one, opened from the wall: shown as it was, read-only. Null is this month.
  const [viewing, setViewing] = useState<string | null>(null);
  const past = viewing ? goal.past.find((p) => p.month === viewing) : undefined;
  const shown = useMemo(() => (past ? finishedMonth(goal, past) : goal), [goal, past]);
  const last = dayOf(shown.today); // tonight, or the day after a past month's last night
  // The open night in the shown month; 0 is none (a past month just opened shows the whole window).
  const [selected, setSelected] = useState(today);
  const [ritual, setRitual] = useState(false);
  const [windows, setWindows] = useState(false);
  // Just after tonight's leaf is set, the window comes to it while it fills in, then steps back.
  const [settling, setSettling] = useState(false);
  const sky = useSky();
  // What the sky APIs said, in a line: the sunset, rain if it's raining, and the place.
  const skyLine = [sky.sunset && `Sunset ${sky.sunset}`, sky.weather?.rain && sky.weather.label, sky.place].filter(Boolean).join(" · ");
  const { top, bottom, insets } = useInsets();
  const looks = useMemo(() => nightLooks(shown), [shown]);
  // When the screen first responds to taps (DevTools > Performance, or performance.getEntriesByName).
  useEffect(() => void performance.mark("ui:ready"), []);
  // ?fresh starts tonight over (handy for showing the wind-down again).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("fresh")) forgetNight(initial.today);
  }, [initial.today]);

  const done = shown.nights.filter((n) => n.done).length;
  const mended = looks.filter((l) => l.mended).length;
  const label = `${shown.intention}: ${monthName(shown.month)}'s window, ${done} of ${viewing ? looks.length : shown.nights.length} nights`;
  const select = (day: number) => day <= last && setSelected(day);

  /** Opens a month from the wall: a past one as it was, or back to this one's tonight. */
  function open(month: string) {
    setWindows(false);
    setViewing(month === goal.month ? null : month);
    setSelected(month === goal.month ? today : 0);
  }

  /** Tonight's leaf is set: the window gets a new night and fills it in. */
  function setTonight(weight: Weight, note: string, line: LineKind) {
    saveNight({ date: goal.today, done: true, weight, ...(note ? { note, line } : {}) });
    setSelected(today);
    setRitual(false);
    setSettling(true);
    setTimeout(() => setSettling(false), 4200);
  }

  /** The night the window brings forward: a past night that's open, or tonight's leaf as it's set. */
  const spotlight = viewing ? selected || null : selected !== today ? selected : settling ? today : null;

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <WindowScene
        goal={shown}
        label={label}
        selected={selected || undefined}
        spotlight={spotlight}
        onSelect={select}
        insets={insets}
        paused={ritual}
        // A past month keeps its own moon; the weather is tonight's, wherever you look.
        sky={viewing ? { weather: sky.weather } : sky}
      />

      <header
        ref={top}
        className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3 text-center before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[calc(100%+2.5rem)] before:bg-gradient-to-b before:from-night/90 before:via-night/60 before:to-transparent"
      >
        <button
          onClick={() => setWindows(true)}
          className="eyebrow pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors hover:text-ink"
          aria-label={`${monthName(shown.month)}: your windows, and next month's`}
        >
          {monthName(shown.month)}
          <svg viewBox="0 0 10 10" className="size-2.5" aria-hidden>
            <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="mt-0.5 font-display text-[26px] leading-tight text-ink">{shown.intention}</h1>
        <p className="mt-1 h-4 text-xs text-mist">{!viewing && skyLine && <span className="animate-fade">{skyLine}</span>}</p>
      </header>

      <div ref={bottom} className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <section className="card overflow-hidden p-0">
          <MonthStrip month={shown.month} design={shown.design} nights={looks} selected={selected} onSelect={select} />
          <div className="border-t border-white/6">
            {selected ? (
              <NightCard key={`${shown.month}-${selected}-${shown.nights.length}`} goal={shown} day={selected} onBegin={() => setRitual(true)} onBack={() => open(goal.month)} />
            ) : (
              // A past month, no night open yet: what the month was.
              <div key={shown.month} className="min-h-[200px] animate-rise px-5 pt-3.5 pb-4">
                <div className="eyebrow flex items-baseline justify-between">
                  <span>
                    {monthName(shown.month)} · {DESIGNS[shown.design].name}
                  </span>
                  <button onClick={() => open(goal.month)} className="-my-2 -mr-2 rounded-full px-2 py-2 tracking-normal text-ink normal-case">
                    Back to tonight
                  </button>
                </div>
                <p className="mt-3 text-sm text-ink">
                  {done} of {looks.length} nights
                </p>
                {mended > 0 && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-gold">
                    <span aria-hidden className="gold-came" />
                    {mended} mended
                  </p>
                )}
                <p className="mt-3 text-sm text-mist">Tap a night to see it.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {ritual && <Ritual goal={goal} onClose={() => setRitual(false)} onDone={setTonight} />}
      {windows && <Windows goal={goal} shown={shown.month} onOpen={open} onClose={() => setWindows(false)} />}
    </main>
  );
}
