// The month's window as data: every piece of glass, what it stands for, and its color.
// This is all the product logic of the window. The renderers (components/GlassWindow
// in 3D, components/FlatWindow as the flat version and the light it casts) only draw it.

import type { DailyGoal, Weight } from "@/lib/data";
import type { Pt } from "@/lib/geometry";
import { mix, paneColors } from "@/lib/glass";
import { lancet, type PieceKind } from "@/lib/lancet";

/**
 * Nights: done (colored glass), gap (missed: clear glass), today (waiting), future (not yet lit).
 * Decoration: crown (the arch, in the month's colors), jewel (the diamonds), spare (cells past the month's end).
 */
export type PaneStatus = "done" | "gap" | "today" | "future" | "crown" | "jewel" | "spare";

export type PaneModel = {
  key: string;
  kind: PieceKind;
  day?: number;
  status: PaneStatus;
  /** A missed night someone came back from: its lead is gold. */
  mended: boolean;
  weight?: Weight;
  points: Pt[];
  color: string;
};

export type WindowModel = { width: number; height: number; outline: Pt[]; panes: PaneModel[] };

const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/** Heavy days are deep, rich glass; light days are paler. */
const DEPTH: Record<Weight, number> = { 3: -0.16, 2: 0, 1: 0.2 };

export function buildWindow(goal: DailyGoal): WindowModel {
  const days = daysIn(goal.month);
  const today = Number(goal.today.slice(8, 10));
  const colors = paneColors(goal.palette, days, goal.month);
  const night = (day: number) => goal.nights[day - 1];
  const { width, height, outline, pieces } = lancet(days);

  const panes = pieces.map((p, i): PaneModel => {
    if (p.kind !== "night") {
      const color = p.kind === "crown" ? mix(goal.palette[i % goal.palette.length], 0.08) : p.kind === "jewel" ? "#f4f0e6" : "#4a3a2e";
      return { key: p.key, kind: p.kind, status: p.kind, mended: false, points: p.points, color };
    }
    const day = p.day!;
    const status: PaneStatus = day === today ? "today" : day > today ? "future" : night(day)?.done ? "done" : "gap";
    const weight = status === "done" ? ((night(day)?.weight ?? 2) as Weight) : undefined;
    const color =
      status === "done" ? mix(colors[day - 1], DEPTH[weight!]) : status === "gap" ? "#dfe6ea" : status === "today" ? "#6a5240" : "#4a3a2e";
    return {
      key: p.key,
      kind: p.kind,
      day,
      status,
      // Mended once any later night (before tonight) was done.
      mended: status === "gap" && goal.nights.slice(day).some((n) => n.done),
      weight,
      points: p.points,
      color,
    };
  });

  return { width, height, outline, panes };
}
