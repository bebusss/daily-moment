// The nights logged in this visit (tonight's check-in, and nights filled in afterwards), and
// tonight's real date. Kept in memory only: a reload starts the evening over, so the check-in can
// be tried again down another path. (A real app would keep them on the device.) No backend, as
// the brief asks, and nothing about anyone's drinking leaves the page.

import { useSyncExternalStore } from "react";
import type { Night } from "@/lib/data";

let logged: Record<string, Night> = {};
const none: Record<string, Night> = {};
const listeners = new Set<() => void>();

/** Logs these nights (by date), over whatever was logged for them before. */
export function saveNights(nights: Night[]) {
  logged = { ...logged, ...Object.fromEntries(nights.map((n) => [n.date, n])) };
  listeners.forEach((l) => l());
}

/** Every night logged in this visit, by date. On the server (and while hydrating), none. */
export function useSavedNights(): Record<string, Night> {
  return useSyncExternalStore(
    (change) => {
      listeners.add(change);
      return () => listeners.delete(change);
    },
    () => logged,
    () => none,
  );
}

/**
 * Tonight's date on this device, "YYYY-MM-DD". The night turns at 4 am, so a check-in at 1 am is
 * still last night's. Within the sample's month only (the sample has no other month to show); on
 * the server, and while hydrating, the sample's own tonight.
 */
export function useTonight(sample: string): string {
  return useSyncExternalStore(
    (change) => {
      const id = setInterval(change, 60_000);
      return () => clearInterval(id);
    },
    () => {
      const d = new Date(Date.now() - 4 * 3600 * 1000);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return local.slice(0, 7) === sample.slice(0, 7) && local >= sample ? local : sample;
    },
    () => sample,
  );
}
