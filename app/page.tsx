// The daily moment: this month's window, and tonight's wind-down.
// The window glows; its light falls across the screen (FlatWindow, blurred) with a
// few soft rays, so the whole screen feels lit by it.

import FlatWindow from "@/components/FlatWindow";
import GlassWindow from "@/components/GlassWindow";
import { getDailyGoal } from "@/lib/data";
import { buildWindow } from "@/lib/window-model";

export default function Page() {
  const goal = getDailyGoal();
  const model = buildWindow(goal);
  const month = new Date(`${goal.month}-01T12:00:00`).toLocaleString("en-US", { month: "long" });
  const done = goal.nights.filter((n) => n.done).length;
  const tonight = new Date(`${goal.today}T12:00:00`).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden px-6 pb-8 pt-10">
      {/* Soft rays from the window, falling down and to the left. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[
          { left: "38%", width: 70, delay: "0s" },
          { left: "52%", width: 46, delay: "-3s" },
          { left: "62%", width: 90, delay: "-6s" },
        ].map((r) => (
          <div
            key={r.left}
            className="absolute top-[14%] h-[95%] origin-top animate-[ray_9s_ease-in-out_infinite] bg-[linear-gradient(to_bottom,rgba(255,214,160,0.24),rgba(255,190,130,0.07)_55%,transparent)] blur-[10px] mix-blend-screen"
            style={{ left: r.left, width: r.width, transform: "rotate(24deg)", animationDelay: r.delay }}
          />
        ))}
      </div>

      <header className="relative text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{month}</p>
        <h1 className="mt-2 font-display text-[28px] leading-tight text-ink">{goal.intention}</h1>
      </header>

      <section className="relative mx-auto mt-3 w-[80%]">
        <GlassWindow goal={goal} label={`${goal.intention}: this month's window, ${done} of ${goal.nights.length} nights`} />
      </section>

      {/* The window's colors, cast down across the screen as blurred light (under the card, which lets it through). */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[-20%] top-[58%] w-[150%] origin-top opacity-40 mix-blend-screen blur-[24px]"
        style={{ transform: "skewX(-30deg) scaleY(0.32)" }}
      >
        <FlatWindow model={model} light />
      </div>

      <p className="relative mt-1 text-center text-sm text-mist">
        {done} of {goal.nights.length} nights
      </p>

      <div className="relative mt-auto rounded-3xl bg-night-2/60 p-5 ring-1 ring-white/5 backdrop-blur-[2px]">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-mist">Tonight · {tonight}</p>
        <button className="mt-4 w-full rounded-2xl bg-ink py-4 text-base font-medium text-night">Begin the wind-down</button>
      </div>
    </main>
  );
}
