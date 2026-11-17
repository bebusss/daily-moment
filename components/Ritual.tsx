"use client";

// Tonight's wind-down, at most three steps over the dimmed window:
//   1. the ritual itself (each step from the data; the breaths are paced on screen),
//   2. how heavy today was (one tap: it sets how deep tonight's glass is),
//   3. one optional line.
// Then the pane is set and the window fills it in.

import { useEffect, useState } from "react";
import Glass from "@/components/Glass";
import { WEIGHTS, type DailyGoal, type RitualStep, type Weight } from "@/lib/data";

type Step = 0 | 1 | 2;
type Props = { goal: DailyGoal; onClose: () => void; onDone: (weight: Weight, note: string) => void };

export default function Ritual({ goal, onClose, onDone }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [checked, setChecked] = useState<string[]>([]);
  const [guided, setGuided] = useState<RitualStep | null>(null);
  const [weight, setWeight] = useState<Weight>(2);
  const [note, setNote] = useState("");

  const check = (id: string) => setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div role="dialog" aria-modal aria-label="Tonight's wind-down" className="fixed inset-0 z-20 bg-night/80 backdrop-blur-sm animate-fade [animation-duration:0.4s]">
      <div className="mx-auto flex h-full max-w-[430px] flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => (guided ? setGuided(null) : step === 0 ? onClose() : setStep((s) => (s - 1) as Step))}
            className="-ml-2 rounded-full p-2 text-mist hover:text-ink"
            aria-label={step === 0 && !guided ? "Close" : "Back"}
          >
            <svg viewBox="0 0 20 20" className="size-5" aria-hidden>
              {step === 0 && !guided ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              ) : (
                <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div className="flex gap-1.5" aria-label={`Step ${step + 1} of 3`}>
            {[0, 1, 2].map((i) => (
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
        ) : step === 0 ? (
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
            <button onClick={() => setStep(1)} disabled={checked.length < goal.ritual.length} className="btn-primary mt-6">
              Continue
            </button>
          </section>
        ) : step === 1 ? (
          <section key="weight" className="flex flex-1 flex-col justify-end animate-rise">
            <h2 className="font-display text-[28px] leading-tight">How heavy was today?</h2>
            <p className="mt-2 text-sm text-mist">Heavier days set deeper glass.</p>
            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {([1, 2, 3] as Weight[]).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setWeight(w);
                    setStep(2);
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
              onDone(weight, note.trim());
            }}
          >
            <h2 className="font-display text-[28px] leading-tight">One line for tonight</h2>
            <p className="mt-2 text-sm text-mist">Optional.</p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Tea, a book, an early night…"
              className="mt-6 w-full rounded-2xl bg-white/4 px-4 py-4 text-base text-ink ring-1 ring-white/8 outline-none placeholder:text-mist/60 focus:ring-gold/50"
            />
            <button type="submit" className="btn-primary mt-6">
              Set tonight&apos;s pane
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
