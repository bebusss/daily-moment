// The card under the window for whichever pane is open: tonight (begin, or already
// set), or a past night (how heavy it was and its line, or a night with no wind-down).

import Glass from "@/components/Glass";
import { dateOf, dayOf, shortDate, WEIGHTS, type DailyGoal } from "@/lib/data";

type Props = { goal: DailyGoal; day: number; onBegin: () => void; onBack: () => void };

export default function NightCard({ goal, day, onBegin, onBack }: Props) {
  const today = dayOf(goal.today);
  const night = goal.nights[day - 1];
  const date = dateOf(goal.month, day);
  const done = goal.nights.filter((n) => n.done).length;

  const head =
    day === today ? (
      <>
        <span>Tonight · {shortDate(date)}</span>
        <span className="tracking-normal normal-case">
          {done} of {goal.nights.length} nights
        </span>
      </>
    ) : (
      <>
        <span>{shortDate(date)}</span>
        <button onClick={onBack} className="-my-1 -mr-2 rounded-full px-2 py-1 tracking-normal text-ink normal-case">
          Tonight
        </button>
      </>
    );

  let body;
  if (day === today && !night) {
    body = (
      <button onClick={onBegin} className="btn-primary mt-4">
        Begin the wind-down
      </button>
    );
  } else if (night?.done) {
    body = (
      <div className="mt-3">
        <p className="flex items-center gap-2.5 text-sm text-ink">
          <Glass weight={night.weight ?? 2} />
          {WEIGHTS[night.weight ?? 2]}
        </p>
        {night.note ? (
          <p className="mt-3 font-display text-xl leading-snug text-ink italic">{night.note}</p>
        ) : (
          <p className="mt-3 text-sm text-mist">No line {day === today ? "tonight" : "that night"}.</p>
        )}
      </div>
    );
  } else {
    // A night with no wind-down stays clear glass. The first night after it set gold lead around it.
    const back = goal.nights.findIndex((n, i) => i >= day && n.done);
    body = (
      <div className="mt-3">
        <p className="text-sm text-ink">No wind-down that night.</p>
        {back >= 0 && (
          <p className="mt-2 flex items-center gap-2 text-sm text-gold">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
            Mended {shortDate(goal.nights[back].date)}
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="card animate-rise" aria-live="polite">
      <div className="eyebrow flex items-baseline justify-between">{head}</div>
      {body}
    </section>
  );
}
