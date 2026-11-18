// The nights logged on this device (tonight's check-in, and nights filled in afterwards), kept so a
// reload doesn't lose them, and tonight's real date. Local only, as the brief asks: no backend, no
// account, and nothing about anyone's drinking leaves the phone. (To start over, open with ?fresh.)

import { useMemo, useSyncExternalStore } from "react";
import type { Night } from "@/lib/data";

const KEY = "leadlight:nights";
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): Record<string, Night> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, Night>) : {};
  } catch {
    return {};
  }
}

/** Keeps these nights (by date), over whatever was kept for them before. */
export function saveNights(nights: Night[]) {
  const all = parse(read());
  for (const n of nights) all[n.date] = n;
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
  changed();
}

export function forgetNights() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  changed();
}

/** Every night logged on this device, by date. On the server (and while hydrating), none. */
export function useSavedNights(): Record<string, Night> {
  const raw = useSyncExternalStore(
    (change) => {
      listeners.add(change);
      window.addEventListener("storage", change);
      return () => {
        listeners.delete(change);
        window.removeEventListener("storage", change);
      };
    },
    read,
    () => null,
  );
  return useMemo(() => parse(raw), [raw]);
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
