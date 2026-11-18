"use client";

// Pictures of next month's crafts, rendered in 3D in the window's room (components/crafts/render).
// The renderer loads only when December's choice is on screen, paints the four once, and goes
// away; the pictures are kept for the visit.

import Image from "next/image";
import { useEffect, useState } from "react";
import type { DailyGoal } from "@/lib/data";

export type Piece = "window" | "mosaic" | "tapestry" | "vase";

let rendered: { key: string; pictures: Promise<Record<Piece, string>> } | null = null;

/** The four pictures in these colors, once they're painted; null until then (or with no goal). */
export function useCraftPictures(goal: DailyGoal | null, palette: string[]) {
  const [pictures, setPictures] = useState<Record<Piece, string> | null>(null);
  useEffect(() => {
    if (!goal) return;
    let live = true;
    const key = palette.join();
    if (rendered?.key !== key) rendered = { key, pictures: import("@/components/crafts/render").then((m) => m.renderCrafts(goal, palette, 540, 720)) };
    rendered.pictures.then((p) => live && setPictures(p));
    return () => {
      live = false;
    };
  }, [goal, palette]);
  return pictures;
}

export default function CraftPicture({ src, label }: { src?: string; label: string }) {
  return src ? (
    <span className="relative block animate-fade overflow-hidden rounded-xl [animation-duration:0.6s]">
      <Image src={src} alt={label} width={540} height={720} unoptimized className="block aspect-[3/4] w-full object-cover" />
      {/* The room's corners fall into shadow. */}
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,transparent_40%,rgba(10,6,4,0.78))]" />
    </span>
  ) : (
    <div role="img" aria-label={label} className="aspect-[3/4] w-full animate-pulse rounded-xl bg-[radial-gradient(ellipse_at_45%_30%,rgba(255,196,130,0.14),transparent_70%),#17110d]" />
  );
}
