// A single piece of leaded glass as a UI swatch: how hard a day was, shown the
// same way the window shows it (easy days pale, hard days deep).

import type { Weight } from "@/lib/data";

const FILL: Record<Weight, string> = {
  1: "var(--color-glass-1)",
  2: "var(--color-glass-2)",
  3: "var(--color-glass-3)",
};

export default function Glass({ weight, className = "h-5 w-3.5" }: { weight: Weight; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-t-full rounded-b-[3px] ring-2 ring-lead ${className}`}
      style={{
        background: `radial-gradient(120% 80% at 35% 25%, rgb(255 255 255 / 0.35), transparent 55%), ${FILL[weight]}`,
        boxShadow: `0 0 18px -2px ${FILL[weight]}`,
      }}
    />
  );
}
