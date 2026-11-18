// Typed loader for the local data file, plus the small date helpers the screen uses.
// The whole "no backend" rule lives here: we just import the JSON.

import sample from "@/data/sample.json";

/** How hard the day felt: 1 easy, 2 normal, 3 hard. Harder days make deeper glass. */
export type Weight = 1 | 2 | 3;

export const WEIGHTS: Record<Weight, string> = { 1: "Easy day", 2: "Normal day", 3: "Hard day" };

/**
 * The night's one line: small proof of what you can do, banked every night. In Marlatt's
 * relapse-prevention model, coping well with a hard moment builds self-efficacy (the confidence
 * that you can handle the next one), and that is what protects against a relapse. The three kinds
 * of question are Nate Zinsser's E-S-P (effort, success, progress). The app never names them:
 * each night gets one question, chosen by the night (firstQuestion), and another if it doesn't fit.
 */
export type LineKind = "effort" | "success" | "progress";

export const LINES: Record<LineKind, { label: string; prompt: string; example: string }> = {
  success: { label: "Success", prompt: "What went right today?", example: "Lime soda at the party. Nobody asked." },
  effort: { label: "Effort", prompt: "What did you try today?", example: "Left before the second round." },
  progress: { label: "Progress", prompt: "What did you handle better than before?", example: "Said no without explaining." },
};

/** The order "Another question" goes through. */
const ORDER: LineKind[] = ["success", "effort", "progress"];

export const nextQuestion = (kind: LineKind) => ORDER[(ORDER.indexOf(kind) + 1) % ORDER.length];

/**
 * Tonight's question. After a drink: what you tried. On the first alcohol-free
 * night after one (the night that mends it): what you handled better than before. Otherwise:
 * what went right.
 */
export function firstQuestion(goal: DailyGoal, drank: boolean): LineKind {
  if (drank) return "effort";
  const today = dayOf(goal.today);
  const lastFree = goal.nights.reduce((last, n) => (n.done && dayOf(n.date) < today ? Math.max(last, dayOf(n.date)) : last), 0);
  return lastFree < today - 1 ? "progress" : "success";
}

/**
 * One night of the month. Done means it was alcohol-free: its leaf is set in color. A night that
 * isn't done stays clear glass, whether the person had a drink (and said so) or didn't check in.
 */
export type Night = {
  date: string;
  done: boolean;
  /** The person checked in and had a drink. The wind-down still happened. */
  drank?: boolean;
  weight?: Weight;
  note?: string;
  line?: LineKind;
};

/** One step of tonight's wind-down. A step with a guide is paced on screen (the breaths). */
export type RitualStep = {
  id: string;
  label: string;
  detail: string;
  guide?: { breaths: number; inhale: number; exhale: number };
};

/** A month's window design (lib/designs.ts). */
export type DesignName = "vine" | "rose" | "sunburst";

/** A month already done: its window stays as it was, on the wall. */
export type PastMonth = {
  month: string;
  intention: string;
  palette: string[];
  design: DesignName;
  nights: Night[];
};

export type DailyGoal = {
  goal: string;
  /** "YYYY-MM": the month this window belongs to. */
  month: string;
  /** This month's window design. */
  design: DesignName;
  /** The months before, oldest first: the wall of windows. */
  past: PastMonth[];
  /** What the person chose this month to be about. It sets the palette. */
  intention: string;
  /** This month's glass colors. */
  palette: string[];
  /** "YYYY-MM-DD": the night being filled in. */
  today: string;
  ritual: RitualStep[];
  /** Every night from the 1st, in order. Tonight is added when the wind-down is done. */
  nights: Night[];
};

export function getDailyGoal(): DailyGoal {
  return sample as DailyGoal;
}

/**
 * The month as of tonight: every night from the 1st, in order. A night that's neither in the data
 * nor logged on this device (and isn't tonight) had no check-in: clear glass, until it's filled in.
 */
export function monthAsOf(goal: DailyGoal, today: string, logged: Record<string, Night>): DailyGoal {
  const byDate = new Map(goal.nights.map((n) => [n.date, n]));
  const nights: Night[] = [];
  for (let d = 1; d <= dayOf(today); d++) {
    const date = dateOf(goal.month, d);
    const n = logged[date] ?? byDate.get(date);
    if (n) nights.push(n);
    else if (d < dayOf(today)) nights.push({ date, done: false });
  }
  return { ...goal, today, nights };
}

/** The same month with these nights logged too. */
export const withNights = (goal: DailyGoal, logged: Night[]) => monthAsOf(goal, goal.today, Object.fromEntries(logged.map((n) => [n.date, n])));

/** A night nobody checked in on (not a night with a drink: nothing is known about it). */
export const noCheckIn = (n: Night) => !n.done && !n.drank && n.weight === undefined;

/** How far back a forgotten night can still be filled in: past a week, memory is a guess. */
export const CATCH_UP_DAYS = 7;

/** The nights before tonight, within the last week, that got no check-in. */
export function unlogged(goal: DailyGoal): string[] {
  const today = dayOf(goal.today);
  return goal.nights.filter((n) => noCheckIn(n) && dayOf(n.date) < today && dayOf(n.date) >= today - CATCH_UP_DAYS).map((n) => n.date);
}

/** A past month as a finished month: every night is behind it. */
export function finishedMonth(goal: DailyGoal, past: PastMonth): DailyGoal {
  const [y, m] = past.month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return { ...goal, ...past, today: `${past.month}-${String(days + 1).padStart(2, "0")}` };
}

// Dates are plain "YYYY-MM-DD" strings, read at noon so no time zone can move them a day.
const at = (date: string) => new Date(`${date}T12:00:00`);

/** The day of the month: "2026-11-17" is 17. The window numbers its panes the same way. */
export const dayOf = (date: string) => Number(date.slice(8, 10));

/** "2026-11" + 9 is "2026-11-09". */
export const dateOf = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

/** "Tue, Nov 17" */
export const shortDate = (date: string) => at(date).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" });

/** "November" */
export const monthName = (month: string, offset = 0) => {
  const d = at(`${month}-01`);
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleString("en-US", { month: "long" });
};
