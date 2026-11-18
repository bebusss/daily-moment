"use client";

// Tonight's check-in and wind-down, over the dimmed window:
//   0. was today alcohol-free? Yes, or "I had a drink";
//   1. the wind-down itself (each step from the data; the breaths are paced on screen),
//   2. how heavy today was (one tap: it sets how deep tonight's glass is),
//   3. one optional line: an effort, a success or progress (Zinsser's E-S-P), the person picks.
// After "I had a drink" the dimming lifts: the whole month's window, every leaf before tonight
// still in color, and one line. Then the wind-down goes on as on any night. Nothing is said about
// what comes next. An alcohol-free night sets tonight's leaf; a night with a drink stays clear.

import { useEffect, useState } from "react";
import Glass from "@/components/Glass";
import { LINES, WEIGHTS, type DailyGoal, type LineKind, type RitualStep, type Weight } from "@/lib/data";

type Step = 0 | 1 | 2 | 3;
type Props = {
  goal: DailyGoal;
  onClose: () => void;
  /** The window shows through while the person looks at it (after "I had a drink"). */
  onReveal: (shown: boolean) => void;
  onDone: (night: { weight: Weight; note: string; line: LineKind; drank: boolean }) => void;
};

export default function Ritual({ goal, onClose, onReveal, onDone }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [drank, setDrank] = useState(false);
  const [held, setHeld] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const [guided, setGuided] = useState<RitualStep | null>(null);
  const [weight, setWeight] = useState<Weight>(2);
  const [note, setNote] = useState("");
  const [line, setLine] = useState<LineKind>("success");

  const check = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const hold = (on: boolean) => {
    setHeld(on);
    onReveal(on);
  };
  const back = () => {
    if (guided) setGuided(null);
    else if (held) hold(false);
    else if (step === 0) onClose();
    else setStep((s) => (s - 1) as Step);
  };

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Tonight's wind-down"
      className={`fixed inset-0 z-20 transition-[background-color,backdrop-filter] duration-1000 ${
        held ? "bg-transparent" : "bg-night/80 backdrop-blur-sm"
      } animate-fade [animation-duration:0.4s]`}
    >
      {/* While the window shows through, the night still covers the card, where the words sit. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,var(--color-night)_0%,rgb(18_13_10/0.94)_34%,transparent_58%)] transition-opacity duration-1000 ${held ? "opacity-100" : "opacity-0"}`}
      />
      <div className="relative mx-auto flex h-full max-w-[430px] flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <button onClick={back} className="-ml-2 rounded-full p-2 text-mist hover:text-ink" aria-label={step === 0 && !guided && !held ? "Close" : "Back"}>
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              {step === 0 && !guided && !held ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div className={`flex gap-1.5 transition-opacity duration-500 ${held ? "opacity-0" : ""}`} aria-label={`Step ${step + 1} of 4`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1 w-6 rounded-full transition-colors duration-500 ${i <= step ? "bg-gold" : "bg-white/12"}`} />
            ))}
          </div>
          <span className="w-9" />
        </div>

        {guided?.guide ? (
          <Breaths
            {...guided.guide}
            onDone={() => {
              if (!checked.includes(guided.id)) check(guided.id);
              setGuided(null);
            }}
          />
        ) : held ? (
          // The night someone had a drink: the month they've built, still there, and one true line.
          <section key="held" className="flex flex-1 flex-col justify-end">
            <p className="animate-rise font-display text-[30px] leading-snug text-ink [animation-delay:0.9s] [animation-duration:1.2s] [animation-fill-mode:both]">
              One night doesn&apos;t undo the others.
            </p>
            <button
              onClick={() => {
                hold(false);
                setStep(1);
              }}
              className="btn-primary mt-8 animate-fade [animation-delay:2.2s] [animation-duration:0.8s] [animation-fill-mode:both]"
            >
              Wind down
            </button>
          </section>
        ) : step === 0 ? (
          <section key="ask" className="flex flex-1 flex-col justify-end animate-rise">
            <h2 className="font-display text-[28px] leading-tight">Was today alcohol-free?</h2>
            {/* Two equal answers: the honest one is never the harder one to tap. */}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  setDrank(false);
                  setStep(1);
                }}
                className="btn-quiet"
              >
                Yes
              </button>
              <button
                onClick={() => {
                  setDrank(true);
                  hold(true);
                }}
                className="btn-quiet"
              >
                I had a drink
              </button>
            </div>
          </section>
        ) : step === 1 ? (
          <section key="ritual" className="flex flex-1 flex-col justify-end animate-rise">
            <h2 className="font-display text-[28px] leading-tight">Tonight&apos;s wind-down</h2>
            <ul className="mt-6 space-y-2.5">
              {goal.ritual.map((r) => {
                const on = checked.includes(r.id);
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => (r.guide && !on ? setGuided(r) : check(r.id))}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left ring-1 transition-colors duration-300 ${
                        on ? "bg-gold/10 ring-gold/40" : "bg-white/4 ring-white/8"
                      }`}
                    >
                      <span className="flex-1">
                        <span className="block text-base text-ink">{r.label}</span>
                        <span className="mt-0.5 block text-sm text-mist">{r.guide && !on ? "Tap to breathe along" : r.detail}</span>
                      </span>
                      <span
                        aria-hidden
                        className={`grid size-6 place-items-center rounded-full ring-1 transition-colors duration-300 ${
                          on ? "bg-gold text-night ring-gold" : "ring-white/25"
                        }`}
                      >
                        {on && (
                          <svg viewBox="0 0 12 12" className="size-3">
                            <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => setStep(2)} disabled={checked.length < goal.ritual.length} className="btn-primary mt-6">
              Continue
            </button>
          </section>
        ) : step === 2 ? (
          <section key="weight" className="flex flex-1 flex-col justify-end animate-rise">
            <h2 className="font-display text-[28px] leading-tight">How heavy was today?</h2>
            {!drank && <p className="mt-2 text-sm text-mist">Heavier days set deeper glass.</p>}
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {([1, 2, 3] as Weight[]).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setWeight(w);
                    setStep(3);
                  }}
                  className="flex flex-col items-center gap-4 rounded-2xl bg-white/4 px-2 pt-6 pb-4 ring-1 ring-white/8 transition-colors active:bg-white/10"
                >
                  <Glass weight={w} className="h-16 w-11" />
                  <span className="text-sm text-ink">{WEIGHTS[w].replace(" day", "")}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <form
            key="line"
            className="flex flex-1 flex-col justify-end animate-rise"
            onSubmit={(e) => {
              e.preventDefault();
              onDone({ weight, note: note.trim(), line, drank });
            }}
          >
            <h2 className="font-display text-[28px] leading-tight">{LINES[line].prompt}</h2>
            <p className="mt-2 text-sm text-mist">Optional. One line.</p>
            <div role="radiogroup" aria-label="Kind of line" className="mt-6 grid grid-cols-3 gap-1 rounded-2xl bg-white/4 p-1 ring-1 ring-white/8">
              {(Object.keys(LINES) as LineKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={line === k}
                  onClick={() => setLine(k)}
                  className={`rounded-xl py-2.5 text-sm transition-colors duration-200 ${line === k ? "bg-ink text-night" : "text-mist"}`}
                >
                  {LINES[k].label}
                </button>
              ))}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder={LINES[line].example}
              className="mt-3 w-full rounded-2xl bg-white/4 px-4 py-4 text-base text-ink ring-1 ring-white/8 outline-none placeholder:text-mist/60 focus:ring-gold/50"
            />
            <button type="submit" className="btn-primary mt-6">
              {drank ? "Done for tonight" : "Set tonight's leaf"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Paced breathing: a warm light grows as you breathe in and fades as you breathe out. */
function Breaths({ breaths, inhale, exhale, onDone }: { breaths: number; inhale: number; exhale: number; onDone: () => void }) {
  // Each breath is two beats (in, out). Beat -1 is a short pause before the first.
  const [beat, setBeat] = useState(-1);
  const inward = beat % 2 === 0;

  useEffect(() => {
    if (beat === breaths * 2) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setBeat((b) => b + 1), beat < 0 ? 600 : (inward ? inhale : exhale) * 1000);
    return () => clearTimeout(t);
  }, [beat, breaths, inhale, exhale, inward, onDone]);

  const breath = Math.min(Math.floor(Math.max(beat, 0) / 2) + 1, breaths);
  const grown = beat >= 0 && beat < breaths * 2 && inward;

  return (
    <section key="breaths" className="flex flex-1 flex-col items-center justify-center animate-fade" aria-live="polite">
      <div className="relative grid size-64 place-items-center">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full ease-in-out"
          style={{
            background: "radial-gradient(circle, rgb(255 214 150 / 0.95) 0%, rgb(231 160 70 / 0.55) 38%, rgb(231 160 70 / 0) 70%)",
            transform: `scale(${grown ? 1 : 0.42})`,
            opacity: grown ? 1 : 0.55,
            transitionProperty: "transform, opacity",
            transitionDuration: `${grown ? inhale : exhale}s`,
          }}
        />
      </div>
      <p className="mt-8 font-display text-[28px]">{beat < 0 ? "Get comfortable" : beat >= breaths * 2 ? "Done" : inward ? "Breathe in" : "Breathe out"}</p>
      <p className="mt-2 text-sm text-mist">
        {breath} of {breaths}
      </p>
    </section>
  );
}
