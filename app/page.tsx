// The daily moment: this month's window, set into the wall of a dim room at
// golden hour, and tonight's wind-down. The scene fills the screen; the words sit on it.

import WindowScene from "@/components/WindowScene";
import { getDailyGoal } from "@/lib/data";

export default function Page() {
  const goal = getDailyGoal();
  const month = new Date(`${goal.month}-01T12:00:00`).toLocaleString("en-US", { month: "long" });
  const done = goal.nights.filter((n) => n.done).length;
  const tonight = new Date(`${goal.today}T12:00:00`).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <WindowScene goal={goal} label={`${goal.intention}: this month's window, ${done} of ${goal.nights.length} nights`} />

      <header className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-night/80 to-transparent px-6 pb-10 pt-8 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{month}</p>
        <h1 className="mt-1.5 font-display text-[26px] leading-tight text-ink">{goal.intention}</h1>
      </header>

      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[430px] px-5 pb-6">
        <div className="rounded-3xl bg-night-2/75 p-5 ring-1 ring-white/5 backdrop-blur-md">
          <div className="flex items-baseline justify-between text-xs font-medium uppercase tracking-[0.18em] text-mist">
            <span>Tonight · {tonight}</span>
            <span className="normal-case tracking-normal">
              {done} of {goal.nights.length} nights
            </span>
          </div>
          <button className="mt-4 w-full rounded-2xl bg-ink py-4 text-base font-medium text-night">Begin the wind-down</button>
        </div>
      </div>
    </main>
  );
}
