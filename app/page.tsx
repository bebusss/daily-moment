"use client";

import { getDailyGoal } from "@/lib/data";

// ────────────────────────────────────────────────────────────────────────────
// This is your canvas.
//
// Replace everything inside this component with the main daily moment of your
// app: the screen where a person does the thing each day, marks it done, and
// feels a small, satisfying pull to come back tomorrow.
//
// The placeholder below only exists to prove the scaffold runs and that the
// sample data loads. Delete it and build your own thing. Design mobile-first;
// make it responsive if you like.
// ────────────────────────────────────────────────────────────────────────────

export default function Page() {
  const goal = getDailyGoal();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-6">
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-500">
        Scaffold is running. Your task is in the{" "}
        <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[0.85em] text-neutral-700">
          README
        </code>
        . Build your daily moment here — edit{" "}
        <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[0.85em] text-neutral-700">
          app/page.tsx
        </code>
        .
      </div>

      <section className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-neutral-900">{goal.goalTitle}</h1>
        <p className="text-sm text-neutral-500">{goal.goalSubtitle}</p>
        <p className="mt-1 text-sm text-neutral-400">
          Loaded from <code className="font-mono">data/sample.json</code> · {goal.streakDays}-day streak ·{" "}
          {goal.items.length} sample items
        </p>
      </section>

      <ul className="flex flex-col gap-2">
        {goal.items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-neutral-200 p-3 text-sm text-neutral-700"
          >
            <span className="font-medium text-neutral-900">{item.label}</span>
            <span className="block text-neutral-400">{item.detail}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
