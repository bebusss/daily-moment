// What the open night says, under the month row: tonight (what there is to do, or how
// it went once it's set), or a past night (how heavy it was and its line, or a night with
// no wind-down and the night that mended it).

import Glass from "@/components/Glass";
import { dateOf, dayOf, LINES, shortDate, WEIGHTS, type DailyGoal } from "@/lib/data";

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
        <button onClick={onBack} className="-my-2 -mr-2 rounded-full px-2 py-2 tracking-normal text-ink normal-case">
          Back to tonight
        </button>
      </>
    );

  let body;
  if (day === today && !night) {
    body = (
      <>
        <h2 className="mt-2 font-display text-xl leading-snug text-ink">Set tonight&apos;s leaf</h2>
        <p className="mt-1 text-sm text-mist">{goal.ritual.map((r, i) => (i ? r.label[0].toLowerCase() + r.label.slice(1) : r.label)).join(", ")}.</p>
        <button onClick={onBegin} className="btn-primary mt-3.5">
          Begin the wind-down
        </button>
      </>
    );
  } else if (night?.done) {
    body = (
      <>
        <p className="mt-3 flex items-center gap-2.5 text-sm text-ink">
          <Glass weight={night.weight ?? 2} />
          {WEIGHTS[night.weight ?? 2]}
          {night.note && night.line && (
            <span className="ml-auto text-[11px] tracking-[0.16em] text-gold uppercase">{LINES[night.line].label}</span>
          )}
        </p>
        {night.note ? (
          <p className="mt-3 font-display text-xl leading-snug text-ink italic">{night.note}</p>
        ) : (
          <p className="mt-3 text-sm text-mist">No line {day === today ? "tonight" : "that night"}.</p>
        )}
      </>
    );
  } else {
    // A night with no wind-down stays clear glass. The first night after it set gold lead around it.
    const back = goal.nights.findIndex((n, i) => i >= day && n.done);
    body = (
      <>
        <p className="mt-3 text-sm text-ink">No wind-down that night.</p>
        {back >= 0 && (
          <p className="mt-2 flex items-center gap-2 text-sm text-gold">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-gold shadow-[0_0_8px_var(--color-gold)]" />
            Mended {shortDate(goal.nights[back].date)}
          </p>
        )}
      </>
    );
  }

  return (
    // One height for every night, so the card (and the window above it) never jumps.
    <div className="animate-rise min-h-[200px] px-5 pt-3.5 pb-4" aria-live="polite">
      <div className="eyebrow flex items-baseline justify-between">{head}</div>
      {body}
    </div>
  );
}
