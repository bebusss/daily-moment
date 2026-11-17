// The daily moment: this month's window, and tonight's wind-down.
// Iteration 1: the window alone, static. Tonight's ritual comes next.

import RoseWindow from "@/components/RoseWindow";
import { getDailyGoal } from "@/lib/data";

export default function Page() {
  const goal = getDailyGoal();
  const month = new Date(`${goal.month}-01T12:00:00`).toLocaleString("en-US", { month: "long" });
  const done = goal.nights.filter((n) => n.done).length;
  const tonight = new Date(`${goal.today}T12:00:00`).toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-8 pt-12">
      <header className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-mist">{month}</p>
        <h1 className="mt-2 font-display text-[28px] leading-tight text-ink">{goal.intention}</h1>
      </header>

      <section className="mx-auto mt-6 w-full max-w-[380px]">
        <RoseWindow goal={goal} />
      </section>

      <p className="mt-5 text-center text-sm text-mist">
        {done} of {goal.nights.length} nights
      </p>

      <div className="mt-auto rounded-3xl bg-night-2 p-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-mist">Tonight · {tonight}</p>
        <button className="mt-4 w-full rounded-2xl bg-ink py-4 text-base font-medium text-night">Begin the wind-down</button>
      </div>
    </main>
  );
}
