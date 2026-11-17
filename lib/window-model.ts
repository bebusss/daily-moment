// The month's window as data: every pane, its state, and every shard's color.
// This is all the product logic of the window. The renderers (components/GlassWindow
// in 3D, components/RoseWindow as the flat fallback) only draw what's here.

import type { DailyGoal, Weight } from "@/lib/data";
import { seeded, type Pt } from "@/lib/geometry";
import { paneColors, shardColors } from "@/lib/glass";
import { RADII, roseWindow } from "@/lib/rose";

/** done: colored glass · gap: a missed night, clear glass · today: waiting · future: unlit. */
export type PaneStatus = "done" | "gap" | "today" | "future";

export type ShardModel = { points: Pt[]; color: string; opacity: number };

export type PaneModel = {
  day: number;
  status: PaneStatus;
  /** A missed night someone came back from: its lead is gold. */
  mended: boolean;
  weight?: Weight;
  outline: Pt[];
  shards: ShardModel[];
};

export type WindowModel = { radius: number; rings: number[]; panes: PaneModel[] };

const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

export function buildWindow(goal: DailyGoal, radius = 160): WindowModel {
  const days = daysIn(goal.month);
  const today = Number(goal.today.slice(8, 10));
  const colors = paneColors(goal.palette, days, goal.month);

  const night = (day: number) => goal.nights[day - 1];
  const statusOf = (day: number): PaneStatus =>
    day === today ? "today" : day > today ? "future" : night(day)?.done ? "done" : "gap";

  const panes = roseWindow(days, radius, goal.month).map(({ day, outline, shards }): PaneModel => {
    const status = statusOf(day);
    const weight = status === "done" ? ((night(day)?.weight ?? 2) as Weight) : undefined;
    const rand = seeded(`${goal.month}:${day}:${status}`);
    const fills = weight
      ? shardColors(colors[day - 1], weight, shards.length, `${goal.month}:${day}`).map((color) => ({ color, opacity: 1 }))
      : shards.map(() =>
          status === "gap"
            ? { color: "#9aaccb", opacity: 0.55 + rand() * 0.2 }
            : status === "today"
              ? { color: "#141c31", opacity: 1 }
              : { color: rand() > 0.5 ? "#0a0e19" : "#0c111d", opacity: 1 },
        );
    return {
      day,
      status,
      // Mended once any later night (before tonight) was done.
      mended: status === "gap" && goal.nights.slice(day).some((n) => n.done),
      weight,
      outline,
      shards: shards.map((points, i) => ({ points, ...fills[i] })),
    };
  });

  return { radius, rings: RADII.slice(1, -1).map((f) => f * radius), panes };
}
