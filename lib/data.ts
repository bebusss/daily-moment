// Typed loader for the local data file.
// The whole "no backend" rule lives here: we just import the JSON.

import sample from "@/data/sample.json";

/** How heavy the day felt: 1 light, 2 normal, 3 heavy. Heavier days make deeper glass. */
export type Weight = 1 | 2 | 3;

/** One night of the month. A night that isn't done stays clear glass. */
export type Night = {
  date: string;
  done: boolean;
  weight?: Weight;
  note?: string;
};

/** One step of tonight's wind-down. */
export type RitualStep = {
  id: string;
  label: string;
  detail: string;
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
  /** Every night before today, in order. */
  nights: Night[];
};

export function getDailyGoal(): DailyGoal {
  return sample as DailyGoal;
}
