// The geometry of the month's window: a tall leaded window with a round arch,
// like the ones in old houses. One pane per night, read like a calendar from the
// top left; small clear diamonds where the leads cross; the arch on top is the
// month's crown, in its intention's colors. Units are scene units, y up.

import type { Pt } from "@/lib/geometry";

export type PieceKind = "night" | "spare" | "jewel" | "crown";

export type Piece = {
  key: string;
  kind: PieceKind;
  /** 1-based night of the month (nights only). */
  day?: number;
  points: Pt[];
};

export type Lancet = { width: number; height: number; outline: Pt[]; pieces: Piece[] };

const arc = (cx: number, cy: number, r: number, from: number, to: number, steps: number): Pt[] =>
  Array.from({ length: steps + 1 }, (_, k) => {
    const a = from + ((to - from) * k) / steps;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });

export function lancet(days: number, cols = 5, cell = 0.44): Lancet {
  const rows = Math.ceil(days / cols);
  const width = cols * cell;
  const r = width / 2;
  const height = rows * cell + r;
  const left = -width / 2;
  const bottom = -height / 2;
  /** Where the arch starts: the top of the grid. */
  const spring = bottom + rows * cell;
  /** How much each pane's corner is cut to make room for a diamond. */
  const ch = cell * 0.17;
  const pieces: Piece[] = [];

  // The arch: a small half-disc at its foot, and a fan of panes around it.
  const fan = 5;
  const inner = r * 0.34;
  pieces.push({ key: "crown-0", kind: "crown", points: arc(0, spring, inner, Math.PI, 0, 16) });
  for (let i = 0; i < fan; i++) {
    const a0 = Math.PI - (Math.PI * i) / fan;
    const a1 = Math.PI - (Math.PI * (i + 1)) / fan;
    pieces.push({ key: `crown-${i + 1}`, kind: "crown", points: [...arc(0, spring, r, a0, a1, 10), ...arc(0, spring, inner, a1, a0, 4)] });
  }

  // The nights: a grid read like a page, with the corners cut where four panes meet.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const day = row * cols + col + 1;
      const x0 = left + col * cell;
      const x1 = x0 + cell;
      const y1 = spring - row * cell;
      const y0 = y1 - cell;
      const cut = { tl: col > 0 && row > 0, tr: col < cols - 1 && row > 0, br: col < cols - 1 && row < rows - 1, bl: col > 0 && row < rows - 1 };
      const points: Pt[] = [
        ...(cut.tl ? ([[x0, y1 - ch], [x0 + ch, y1]] as Pt[]) : ([[x0, y1]] as Pt[])),
        ...(cut.tr ? ([[x1 - ch, y1], [x1, y1 - ch]] as Pt[]) : ([[x1, y1]] as Pt[])),
        ...(cut.br ? ([[x1, y0 + ch], [x1 - ch, y0]] as Pt[]) : ([[x1, y0]] as Pt[])),
        ...(cut.bl ? ([[x0 + ch, y0], [x0, y0 + ch]] as Pt[]) : ([[x0, y0]] as Pt[])),
      ];
      pieces.push(day <= days ? { key: `night-${day}`, kind: "night", day, points } : { key: `spare-${day}`, kind: "spare", points });
    }
  }

  // The diamonds where the leads cross.
  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      const [cx, cy] = [left + col * cell, spring - row * cell];
      pieces.push({ key: `jewel-${row}-${col}`, kind: "jewel", points: [[cx, cy + ch], [cx + ch, cy], [cx, cy - ch], [cx - ch, cy]] });
    }
  }

  const outline: Pt[] = [[left, bottom], [left + width, bottom], ...arc(0, spring, r, 0, Math.PI, 32)];
  return { width, height, outline, pieces };
}
