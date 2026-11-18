// What the open night says, under the month row: tonight (what there is to do, or how it went
// once it's checked in), or a past night (how hard it was and its line; for a night with a
// drink, also the night that mended it).

import Glass from "@/components/Glass";
import { CATCH_UP_DAYS, dateOf, dayOf, noCheckIn, shortDate, WEIGHTS, type DailyGoal } from "@/lib/data";

type Props = { goal: DailyGoal; day: number; onBegin: () => void; onBack: () => void; onLog?: (date: string, drank: boolean) => void };

export default function NightCard({ goal, day, onBegin, onBack, onLog }: Props) {
  const today = dayOf(goal.today);
  const night = goal.nights[day - 1];
  const date = dateOf(goal.month, day);
  const done = goal.nights.filter((n) => n.done).length;
  const tonight = day === today;

  const head = tonight ? (
    <>
      <span>Tonight · {shortDate(date)}</span>
      <span className="tracking-normal normal-case">
        {done} of {goal.nights.length} alcohol-free
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

  // The night's own line, as the person wrote it, and nothing else.
  const said = night?.note && <p className="mt-3 font-display text-xl leading-snug text-ink italic">{night.note}</p>;

  let body;
  if (tonight && !night) {
    body = (
      <>
        <h2 className="mt-2 font-display text-xl leading-snug text-ink">Tonight&apos;s wind-down</h2>
        <p className="mt-1 text-sm text-mist">One question, three slow breaths, a line if you like.</p>
        <button onClick={onBegin} className="btn-primary mt-3.5">
          Begin
        </button>
      </>
    );
  } else if (night?.done) {
    body = (
      <>
        <p className="mt-3 flex items-center gap-2.5 text-sm text-ink">
          <Glass weight={night.weight ?? 2} />
          Alcohol-free · {WEIGHTS[night.weight ?? 2].toLowerCase()}
        </p>
        {said || <p className="mt-3 text-sm text-mist">No line {tonight ? "tonight" : "that night"}.</p>}
      </>
    );
  } else if (tonight) {
    // Tonight, with a drink: what the window showed, said again, and the person's own line.
    body = (
      <>
        <p className="mt-3 font-display text-xl leading-snug text-ink">One night doesn&apos;t undo the others.</p>
        {said}
      </>
    );
  } else {
    // A clear night. The first alcohol-free night after it set gold lead around it. A night with
    // no check-in from the last week can still be filled in: forgetting isn't drinking.
    const back = goal.nights.findIndex((n, i) => i >= day && n.done);
    const fillable = onLog && night && noCheckIn(night) && day >= today - CATCH_UP_DAYS;
    body = (
      <>
        <p className="mt-3 text-sm text-ink">{night?.drank ? "A drink that night." : "No check-in that night."}</p>
        {said}
        {fillable && (
          <div className="mt-3 flex items-center gap-2">
            <span className="mr-1 text-sm text-mist">Remember it?</span>
            {[false, true].map((drank) => (
              <button
                key={String(drank)}
                onClick={() => onLog(night.date, drank)}
                className="rounded-full px-3.5 py-2 text-sm text-ink ring-1 ring-white/12 transition-colors active:bg-white/10"
              >
                {drank ? "A drink" : "Alcohol-free"}
              </button>
            ))}
          </div>
        )}
        {back >= 0 && (
          <p className="mt-3 flex items-center gap-2 text-sm text-gold">
            <span aria-hidden className="gold-came" />
            Mended {back === today - 1 ? "tonight" : shortDate(goal.nights[back].date)}
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
