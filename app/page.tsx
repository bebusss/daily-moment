// ============================================================================
// This is your canvas.
//
// Replace everything in this component with the main daily moment of your app:
// the screen where a person does the thing each day, marks it done, and feels a
// small, satisfying pull to come back tomorrow.
//
// What's here now is just a starter message. Delete it and build your own thing.
// Design mobile-first; make it responsive if you like. Full brief is in the
// README. A sample data file is ready for you at data/sample.json, with a small
// typed loader in lib/data.ts (import { getDailyGoal } from "@/lib/data").
// ============================================================================

export default function Page() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
        Starter scaffold
      </span>

      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">
          This screen is your canvas
        </h1>
        <p className="text-base leading-relaxed text-neutral-600">
          Build the main daily moment here, in{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-700">
            app/page.tsx
          </code>
          . The full brief is in the{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-neutral-700">
            README
          </code>
          .
        </p>
      </div>

      <p className="text-sm text-neutral-400">
        There&apos;s a sample data file at{" "}
        <code className="font-mono">data/sample.json</code> to build from. Reshape
        it to fit your goal.
      </p>
    </main>
  );
}
