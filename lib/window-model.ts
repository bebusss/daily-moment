// The month's window as data: every piece of glass, what it stands for, and how it's made.
// This is all the product logic of the window. The renderers (components/WindowScene in
// 3D, components/FlatWindow as the flat fallback) only draw it.
//
// One leaf per night on a vine that climbs the window:
// - a night done is a leaf of colored glass, deeper the heavier the day was;
// - a night missed is a leaf of clear glass: it stays, you can see through it;
// - coming back after a miss mends it: its lead turns gold;
// - tonight's leaf waits, lit from within; the nights to come are pale, uncolored glass.

import type { DailyGoal, Weight } from "@/lib/data";
import type { Pt } from "@/lib/geometry";
import { mix, paneColors, pick, saturate } from "@/lib/glass";
import { vineWindow, type Design, type LeafFrame, type PieceKind } from "@/lib/vine";

export type PaneStatus = "done" | "gap" | "today" | "future" | "decor";

/** How the glass was made, which decides how it lets light through. */
export type GlassType = "cathedral" | "seedy" | "opal" | "jewel";

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
  glass: GlassType;
  /** 0 clear (the outside shows through sharp) to 1 milky (only light comes through). */
  diffusion: number;
  tone: number;
  grain: number;
  leaf?: LeafFrame;
};

export type WindowModel = { width: number; height: number; outline: Pt[]; panes: PaneModel[]; bars: number[] };

export const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/** Heavy days are deep, rich glass; light days are paler. */
const DEPTH: Record<Weight, { shade: number; sat: number }> = {
  3: { shade: -0.26, sat: 1.45 },
  2: { shade: -0.08, sat: 1.3 },
  1: { shade: 0.1, sat: 1.1 },
};

const GROUND = ["#e2c690", "#d6c79f", "#e6cf9f", "#c3c8ad", "#dfbb83", "#cdbf98", "#d9cfae", "#e8c88e", "#bfc6b4", "#d8b57e"];
const SKY = ["#203168", "#293c7a", "#1b2958", "#2f427e", "#24387a"];
const STEM = ["#6b7433", "#77682f", "#5d6a2e"];

/** What one night looks like in glass. The window's leaves and the month row under it both read this. */
export type NightLook = { day: number; status: Exclude<PaneStatus, "decor">; mended: boolean; weight?: Weight; color: string };

export function nightLooks(goal: DailyGoal): NightLook[] {
  const days = daysIn(goal.month);
  const today = Number(goal.today.slice(8, 10));
  const colors = paneColors(goal.palette, days, goal.month);
  const night = (day: number) => goal.nights[day - 1];
  return Array.from({ length: days }, (_, i): NightLook => {
    const day = i + 1;
    const status = day > today ? "future" : night(day)?.done ? "done" : day === today ? "today" : "gap";
    if (status === "done") {
      const weight = (night(day)?.weight ?? 2) as Weight;
      const { shade, sat } = DEPTH[weight];
      return { day, status, mended: false, weight, color: mix(saturate(colors[day - 1], sat), shade) };
    }
    // A missed night is mended once any later night (before tonight) was done.
    if (status === "gap") return { day, status, mended: goal.nights.slice(day).some((n) => n.done), color: "#f2efe6" };
    return { day, status, mended: false, color: status === "today" ? "#f0d6a4" : "#cdd5bd" };
  });
}

/** The vine's geometry depends only on the month, so each month's is cut once and kept. */
const designs = new Map<string, Design>();
function designFor(month: string): Design {
  let design = designs.get(month);
  if (!design) designs.set(month, (design = vineWindow(daysIn(month), month)));
  return design;
}

export function buildWindow(goal: DailyGoal): WindowModel {
  const looks = nightLooks(goal);
  const design = designFor(goal.month);
  let border = 0;

  const panes = design.pieces.map((p): PaneModel => {
    const base = { key: p.key, kind: p.kind, points: p.points, tone: p.tone, grain: p.grain, leaf: p.leaf, mended: false };
    switch (p.kind) {
      case "night": {
        const look = looks[p.day! - 1];
        const glass: GlassType = look.status === "done" ? "cathedral" : look.status === "gap" ? "seedy" : "opal";
        const diffusion = look.status === "done" ? 0.72 : look.status === "gap" ? 0.12 : 0.95;
        return { ...base, ...look, glass, diffusion };
      }
      case "ground":
        return { ...base, status: "decor", color: pick(GROUND, p.tone), glass: "cathedral", diffusion: 0.82 };
      case "sky":
        return { ...base, status: "decor", color: pick(SKY, p.tone), glass: "cathedral", diffusion: 0.85 };
      case "stem":
        return { ...base, status: "decor", color: pick(STEM, p.tone), glass: "cathedral", diffusion: 0.85 };
      case "bud":
        return { ...base, status: "decor", color: "#e2a23a", glass: "cathedral", diffusion: 0.8 };
      case "moon":
        return { ...base, status: "decor", color: "#f2dc9c", glass: "opal", diffusion: 0.97 };
      case "star":
        return { ...base, status: "decor", color: "#ffe6a2", glass: "jewel", diffusion: 0.6 };
      case "fillet":
        return { ...base, status: "decor", color: "#f3e8cf", glass: "cathedral", diffusion: 0.75 };
      case "jewel":
        return { ...base, status: "decor", color: saturate(mix(pick(goal.palette, p.tone), -0.25), 1.6), glass: "jewel", diffusion: 0.55 };
      case "border": {
        // The border walks the month's colors, deep.
        const c = goal.palette[border++ % goal.palette.length];
        return { ...base, status: "decor", color: saturate(mix(c, -0.42), 1.55), glass: "cathedral", diffusion: 0.85 };
      }
    }
  });

  return { width: design.width, height: design.height, outline: design.outline, panes, bars: design.bars };
}
