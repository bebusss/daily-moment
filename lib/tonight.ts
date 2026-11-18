// Tonight's night, kept on this device so a reload doesn't lose it. Local only, as the brief
// asks: no backend, no account. (To start tonight over, open the page with ?fresh.)

import { useMemo, useSyncExternalStore } from "react";
import type { Night } from "@/lib/data";

const key = (date: string) => `daily-moment:night:${date}`;
const listeners = new Set<() => void>();

function read(date: string): string | null {
  try {
    return localStorage.getItem(key(date));
  } catch {
    return null;
  }
}

export function saveNight(night: Night) {
  try {
    localStorage.setItem(key(night.date), JSON.stringify(night));
  } catch {}
  listeners.forEach((l) => l());
}

export function forgetNight(date: string) {
  try {
    localStorage.removeItem(key(date));
  } catch {}
  listeners.forEach((l) => l());
}

/** The night saved for `date` on this device, if any. On the server (and while hydrating), none. */
export function useSavedNight(date: string): Night | null {
  const raw = useSyncExternalStore(
    (change) => {
      listeners.add(change);
      window.addEventListener("storage", change);
      return () => {
        listeners.delete(change);
        window.removeEventListener("storage", change);
      };
    },
    () => read(date),
    () => null,
  );
  return useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as Night) : null;
    } catch {
      return null;
    }
  }, [raw]);
}
