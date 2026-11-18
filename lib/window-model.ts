// The month's window as data: every piece of glass, what it stands for, and how it's made.
// This is all the product logic of the window. The renderers (components/WindowScene in
// 3D, components/FlatWindow as the flat fallback) only draw it.
//
// One leaf per night on a vine that climbs the window:
// - an alcohol-free night is a leaf of colored glass, deeper the harder the day was;
// - a night with a drink (or no check-in) is a leaf of clear glass: it stays, light passes through it;
// - the next alcohol-free night mends it: its lead turns gold (never before, never announced);
// - tonight's leaf waits, lit from within; the nights to come are pale, uncolored glass;
// - once tonight is checked in, tomorrow's leaf waits too, faintly.

import type { DailyGoal, Weight } from "@/lib/data";
import type { Pt } from "@/lib/geometry";
import { mix, paneColors, pick, saturate } from "@/lib/glass";
import { cutWindow } from "@/lib/designs";
import { moonShape, type Design, type LeafFrame, type PieceKind } from "@/lib/vine";

export type PaneStatus = "done" | "gap" | "today" | "future" | "decor";

/** How the glass was made, which decides how it lets light through. */
export type GlassType = "cathedral" | "seedy" | "opal" | "jewel";

export type PaneModel = {
  key: string;
  kind: PieceKind;
  day?: number;
  status: PaneStatus;
  /** A clear night (a drink, or no check-in) followed by an alcohol-free one: its lead is gold. */
  mended: boolean;
  next?: boolean;
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

/** `id` is the month and its design: one window, whatever state its nights are in. */
export type WindowModel = { id: string; width: number; height: number; outline: Pt[]; panes: PaneModel[]; bars: number[] };

export const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};

/** Hard days are deep, rich glass; easy days are paler. */
const DEPTH: Record<Weight, { shade: number; sat: number }> = {
  3: { shade: -0.24, sat: 1.25 },
  2: { shade: -0.06, sat: 1.15 },
  1: { shade: 0.14, sat: 1.0 },
};

const GROUND = ["#ecdcbc", "#e4d9be", "#eedfbf", "#dfdcc0", "#e9d6b2", "#e2d3b4", "#ecdfc4", "#ebd7b4", "#dcdcc4", "#e6d3b0"];
const SKY = ["#203168", "#293c7a", "#1b2958", "#2f427e", "#24387a"];
const STEM = ["#6b7433", "#77682f", "#5d6a2e"];

/** What one night looks like in glass. The window's leaves and the month row under it both read this. */
export type NightLook = {
  day: number;
  status: Exclude<PaneStatus, "decor">;
  mended: boolean;
  /** A clear night the person checked in on: they had a drink. */
  drank?: boolean;
  /** Tomorrow's leaf, once tonight's is set: it waits too, faintly. */
  next?: boolean;
  weight?: Weight;
  color: string;
};

export function nightLooks(goal: DailyGoal): NightLook[] {
  const days = daysIn(goal.month);
  const today = Number(goal.today.slice(8, 10));
  const colors = paneColors(goal.palette, days, goal.month);
  const night = (day: number) => goal.nights[day - 1];
  return Array.from({ length: days }, (_, i): NightLook => {
    const day = i + 1;
    // Tonight waits until it's checked in; checked in with a drink, it's clear glass like any other.
    const status = day > today ? "future" : night(day)?.done ? "done" : day === today && !night(day) ? "today" : "gap";
    if (status === "done") {
      const weight = (night(day)?.weight ?? 2) as Weight;
      const { shade, sat } = DEPTH[weight];
      return { day, status, mended: false, weight, color: mix(saturate(colors[day - 1], sat), shade) };
    }
    // A clear night is mended only by a later alcohol-free night (tonight's included, once it's set).
    if (status === "gap") return { day, status, mended: goal.nights.slice(day).some((n) => n.done), drank: night(day)?.drank, color: "#f2efe6" };
    const next = status === "future" && day === today + 1 && Boolean(night(today));
    return { day, status, mended: false, next, color: status === "today" ? "#f0d6a4" : next ? "#d2dcc0" : "#b9c4a5" };
  });
}

/** A window's geometry depends only on its month and design, so each is cut once and kept. */
const designs = new Map<string, Design>();
function designFor(goal: DailyGoal): Design {
  const key = `${goal.month}:${goal.design}`;
  let design = designs.get(key);
  if (!design) designs.set(key, (design = cutWindow(goal.design, daysIn(goal.month), goal.month)));
  return design;
}

/** Tonight's moon, as the window's piece: kept per phase, so the same phase is the same shape. */
const moons = new Map<string, Pt[]>();
function moonFor(design: Design, moon: { lit: number; waxing: boolean }) {
  const key = `${design.moon.c.join()}:${moon.lit.toFixed(2)}:${moon.waxing}`;
  let shape = moons.get(key);
  if (!shape) moons.set(key, (shape = moonShape(design.moon.c, design.moon.r, moon.lit, moon.waxing)));
  return shape;
}

/** The month's window. With `moon` (from the sky API), its moon is tonight's phase; without, the drawn crescent. */
export function buildWindow(goal: DailyGoal, moon?: { lit: number; waxing: boolean }): WindowModel {
  const looks = nightLooks(goal);
  const design = designFor(goal);
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
      case "sun":
        return { ...base, status: "decor", color: "#f0b347", glass: "opal", diffusion: 0.9 };
      case "moon":
        return { ...base, points: moon ? moonFor(design, moon) : base.points, status: "decor", color: "#f2dc9c", glass: "opal", diffusion: 0.97 };
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

  return { id: `${goal.month}:${goal.design}`, width: design.width, height: design.height, outline: design.outline, panes, bars: design.bars };
}
