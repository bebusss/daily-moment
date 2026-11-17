// Tiny typed loader for the local sample data file.
// The whole "no backend" rule lives here: we just import the JSON.
// Reshape data/sample.json to fit your goal, and the types below follow along.

import sample from "@/data/sample.json";

export type DailyGoal = typeof sample;
export type HistoryEntry = (typeof sample)["history"][number];
export type GoalItem = (typeof sample)["items"][number];

export function getDailyGoal(): DailyGoal {
  return sample;
}
