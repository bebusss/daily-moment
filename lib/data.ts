// Typed loader for the local data file, plus the small date helpers the screen uses.
// The whole "no backend" rule lives here: we just import the JSON.

import sample from "@/data/sample.json";

/** How heavy the day felt: 1 light, 2 normal, 3 heavy. Heavier days make deeper glass. */
export type Weight = 1 | 2 | 3;

export const WEIGHTS: Record<Weight, string> = { 1: "Light day", 2: "Normal day", 3: "Heavy day" };

/**
 * The night's line, after Nate Zinsser's E-S-P: one honest effort, one thing that went
 * right, or one bit of progress. Small proof of what you can do, banked every night.
 */
export type LineKind = "effort" | "success" | "progress";

export const LINES: Record<LineKind, { label: string; prompt: string; example: string }> = {
  effort: { label: "Effort", prompt: "Where did you really try today?", example: "Finished the walk in the rain." },
  success: { label: "Success", prompt: "What went right today?", example: "Read instead of scrolling." },
  progress: { label: "Progress", prompt: "What did you handle better than before?", example: "Left early, no explaining." },
};

/** One night of the month. A night that isn't done stays clear glass. */
export type Night = {
  date: string;
  done: boolean;
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

export type DailyGoal = {
  goal: string;
  /** "YYYY-MM": the month this window belongs to. */
  month: string;
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
