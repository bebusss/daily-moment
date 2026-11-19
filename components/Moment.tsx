"use client";

// The daily moment's state: the month's nights (tonight's kept on this device), which night is
// open, and whether tonight's check-in and wind-down are running. The window (WindowScene) only draws what it's given;
// everything the person reads and touches sits on top of it: the month and intention
// above, and one card below with the month's row of nights and the open night.

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import MonthStrip from "@/components/MonthStrip";
import NightCard from "@/components/NightCard";
import Ritual from "@/components/Ritual";
import Windows from "@/components/Windows";
import { dayOf, finishedMonth, monthAsOf, monthName, withNights, type DailyGoal, type DesignName, type LineKind, type Night, type Weight } from "@/lib/data";
import { DESIGNS } from "@/lib/designs";
import { useSky } from "@/lib/sky";
import { MEND_QUOTES, mendQuote, type Quote } from "@/lib/quotes";
import { saveNights, useSavedNights, useTonight } from "@/lib/tonight";
import { nightLooks } from "@/lib/window-model";

type Phase = "ask" | "held" | "wind";

/** How much of the screen the words take after "I had a drink": the window gets the rest. */
const HELD_WORDS = 290;

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
  // The month as of tonight's real date: the nights in the data, the ones logged in this visit
  // (a reload starts over), and the ones in between, with no check-in.
  const logged = useSavedNights();
  const tonight = useTonight(initial.today);
  const design = useDesignOverride();
  const goal = useMemo(() => {
    const month = monthAsOf(initial, tonight, logged);
    return design ? { ...month, design } : month;
  }, [initial, tonight, logged, design]);
  const today = dayOf(goal.today);
  // A month before this one, opened from the wall: shown as it was, read-only. Null is this month.
  const [viewing, setViewing] = useState<string | null>(null);
  const past = viewing ? goal.past.find((p) => p.month === viewing) : undefined;
  const shown = useMemo(() => (past ? finishedMonth(goal, past) : goal), [goal, past]);
  const last = dayOf(shown.today); // tonight, or the day after a past month's last night
  // The open night in the shown month; 0 is none (a past month just opened shows the whole window).
  const [selected, setSelected] = useState(today);
  // Tonight's real date arrives after the page loads (and the night turns at 4 am): the open
  // night follows it if it was tonight.
  const [seenToday, setSeenToday] = useState(today);
  if (seenToday !== today) {
    setSeenToday(today);
    if (selected === seenToday) setSelected(today);
  }
  const [ritual, setRitual] = useState(false);
  // Where the check-in is, for the window behind it: the question (the view moves in to tonight's
  // leaf, under the dimming), after "I had a drink" (the dimming lifts and the view pulls back to the
  // whole month), or the wind-down itself (the window rests, not drawn).
  const [phase, setPhase] = useState<Phase>("ask");
  // The clear nights a check-in has just mended, while their gold is soldered...
  const [mending, setMending] = useState<number[]>([]);
  // ...and until it is, the row of nights still shows them clear.
  const [unsoldered, setUnsoldered] = useState<number[]>([]);
  // The mending, as a moment of its own: the card steps away, the line under the window, then the
  // slow way back to the whole month.
  const [mendMoment, setMendMoment] = useState<{ words: boolean; back: boolean; leaving?: boolean } | null>(null);
  // What the window says then: a line about falling and getting up, a different one each time.
  const [quote, setQuote] = useState<Quote>(MEND_QUOTES[0]);
  const [windows, setWindows] = useState(false);
  // Just after tonight's leaf is set, the window comes to it while it fills in, then steps back.
  const [settling, setSettling] = useState(false);
  const sky = useSky();
  // What the sky APIs said, in a line: the sunset, rain if it's raining, and the place.
  const skyLine = [sky.sunset && `Sunset ${sky.sunset}`, sky.weather?.rain && sky.weather.label, sky.place].filter(Boolean).join(" · ");
  const { top, bottom, insets } = useInsets();
  const looks = useMemo(
    () => nightLooks(shown).map((l) => (!viewing && unsoldered.includes(l.day) ? { ...l, mended: false } : l)),
    [shown, viewing, unsoldered],
  );
  // When the screen first responds to taps (DevTools > Performance, or performance.getEntriesByName).
  useEffect(() => void performance.mark("ui:ready"), []);

  const done = shown.nights.filter((n) => n.done).length;
  const mended = looks.filter((l) => l.mended).length;
  const label = `${shown.intention}: ${monthName(shown.month)}'s window, ${done} of ${viewing ? looks.length : shown.nights.length} nights alcohol-free`;
  const select = (day: number) => day <= last && setSelected(day);

  /** Opens a month from the wall: a past one as it was, or back to this one's tonight. */
  function open(month: string) {
    setWindows(false);
    setViewing(month === goal.month ? null : month);
    setSelected(month === goal.month ? today : 0);
  }

  const mendedNow = () =>
    new Set(
      nightLooks(goal)
        .filter((l) => l.mended)
        .map((l) => l.day),
    );

  /**
   * The nights just mended (in `next`, not in `before`) get their gold soldered as you watch, after
   * `wait` (tonight's leaf filling in first, or a breath). Never announced before: until then they
   * stay plain, in the window and in the row. It's a moment of its own: the card steps away and the
   * view goes to each leaf in turn, oldest first, while its iron goes round (more than a few, all at
   * once, on the whole window). Once the first gold is laid, one line. Then the slow way back to the
   * whole month. Returns when it's over (ms), 0 if nothing was mended.
   */
  function solder(before: Set<number>, next: DailyGoal, wait: number) {
    const fresh = nightLooks(next)
      .filter((l) => l.mended && !before.has(l.day))
      .map((l) => l.day);
    if (!fresh.length) return 0;
    const turns = fresh.length <= 4 ? fresh.map((d) => [d]) : [fresh];
    // The view arrives (0.8 s), the iron goes round (2 s), a breath before the next.
    const [arrive, laid, step] = [600, 800 + 2000, 3300];
    setUnsoldered(fresh);
    setQuote(mendQuote());
    setTimeout(() => setMendMoment({ words: false, back: false }), wait);
    turns.forEach((nights, i) => {
      const at = wait + arrive + i * step;
      setTimeout(() => setMending(nights), at);
      setTimeout(() => setUnsoldered((u) => u.filter((d) => !nights.includes(d))), at + laid);
    });
    setTimeout(() => setMendMoment({ words: true, back: false }), wait + arrive + laid + 300);
    const last = wait + arrive + (turns.length - 1) * step + laid;
    setTimeout(() => {
      setMending([]);
      setMendMoment({ words: true, back: true });
    }, last + 900);
    const over = last + 900 + 4200;
    setTimeout(() => setMendMoment({ words: true, back: true, leaving: true }), over - 700);
    setTimeout(() => setMendMoment(null), over);
    return over;
  }

  function begin() {
    setPhase("ask");
    setRitual(true);
  }

  /**
   * Tonight is checked in. Alcohol-free: tonight's leaf is set and fills in, then the nights it
   * mended are soldered. That moment belongs to coming back tonight, so only tonight's leaf gets it:
   * nights filled in before tonight that mended others already show their gold. With a drink:
   * tonight stays clear glass, and nothing is soldered.
   */
  function checkIn({ weight, note, line, drank }: { weight: Weight; note: string; line: LineKind; drank: boolean }) {
    const night: Night = { date: goal.today, done: !drank, weight, ...(drank ? { drank } : {}), ...(note ? { note, line } : {}) };
    const before = mendedNow();
    saveNights([night]);
    setSelected(today);
    setRitual(false);
    if (drank) return;
    const over = solder(before, withNights(goal, [night]), 3400);
    setSettling(true);
    setTimeout(() => setSettling(false), Math.max(4200, over));
  }

  /**
   * A forgotten night filled in from its card. Alcohol-free, its leaf fills in, and the nights it
   * mends simply show their gold: that was days ago, and the moment is for coming back tonight.
   */
  function logNight(date: string, drank: boolean) {
    saveNights([drank ? { date, done: false, drank: true } : { date, done: true, weight: 2 }]);
  }

  /** The night the window brings forward: a past night that's open, tonight's leaf as it's set, or the night it mended. */
  const spotlight = viewing
    ? selected || null
    : ritual
      ? phase === "ask"
        ? today
        : null
      : mendMoment?.back
        ? null
        : mending.length
          ? mending.length === 1
            ? mending[0]
            : null
          : selected !== today
            ? selected
            : settling
              ? today
              : null;
  // After "I had a drink" the window takes the room the card leaves, above the words.
  const held = ritual && phase === "held";
  // Either moment (after a drink, or the mending) gives the window the card's room, above the words.
  const words = held || mendMoment !== null;

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <WindowScene
        goal={shown}
        label={label}
        selected={selected || undefined}
        mending={mending}
        spotlight={spotlight}
        onSelect={select}
        insets={words ? { top: insets.top, bottom: HELD_WORDS } : insets}
        paused={ritual && phase === "wind"}
        slow={held || Boolean(mendMoment?.back)}
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

      {/* During the check-in the card steps away: nothing shows through the wind-down, and when the window does, only it and the line remain. */}
      <div
        ref={bottom}
        className={`absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-700 ${ritual || mendMoment ? "pointer-events-none opacity-0" : ""}`}
      >
        <section className="card overflow-hidden p-0">
          <MonthStrip month={shown.month} design={shown.design} nights={looks} selected={selected} onSelect={select} />
          <div className="border-t border-white/6">
            {selected ? (
              <NightCard
                key={`${shown.month}-${selected}-${shown.nights.length}`}
                goal={shown}
                day={selected}
                onBegin={begin}
                onLog={viewing ? undefined : logNight}
                onBack={() => open(goal.month)}
              />
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
                  {done} of {looks.length} nights alcohol-free
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

      {mendMoment && (
        // The mending: night under the window, and one line once the first gold is laid.
        <div aria-live="polite" className={`pointer-events-none fixed inset-0 z-20 transition-opacity duration-700 ${mendMoment.leaving ? "opacity-0" : ""}`}>
          <div className="absolute inset-0 animate-fade bg-[linear-gradient(to_top,var(--color-night)_0px,rgb(18_13_10/0.92)_230px,transparent_320px)] [animation-duration:1s]" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-5 pb-[max(3rem,env(safe-area-inset-bottom))]">
            {mendMoment.words && (
              <figure className="animate-rise [animation-duration:1.4s]">
                <blockquote className="font-display text-[26px] leading-snug text-ink">{quote.text}</blockquote>
                <figcaption className="mt-3 text-sm text-mist">{quote.by}</figcaption>
              </figure>
            )}
          </div>
        </div>
      )}
      {ritual && <Ritual goal={goal} onClose={() => setRitual(false)} onLog={saveNights} onPhase={setPhase} onDone={checkIn} />}
      {windows && <Windows goal={goal} shown={shown.month} onOpen={open} onClose={() => setWindows(false)} />}
    </main>
  );
}
