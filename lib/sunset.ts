// Tonight's sunset where the person is, from Open-Meteo (free, no key, no signup).
//
// No location prompt: the device's time zone already names a city ("America/Mexico_City").
// Open-Meteo's geocoder turns that city into coordinates (we keep it only if its time zone
// matches), and the forecast gives the sunset there, in local time.
//
// Slow or down: both calls share one 3-second budget. On any failure we return null and
// the screen simply leaves the sunset line out. Nothing else depends on it.

import { useEffect, useState } from "react";

export type Sunset = { time: string; place: string };

const BUDGET_MS = 3000;

type Geocoding = { results?: { name: string; latitude: number; longitude: number; timezone: string }[] };
type Forecast = { daily: { sunset: string[] } };

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return (await res.json()) as T;
}

/** "17:57" is "5:57 pm". */
function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

export async function fetchSunset(timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone): Promise<Sunset | null> {
  const city = timeZone.split("/").pop()?.replaceAll("_", " ");
  if (!city) return null;
  const signal = AbortSignal.timeout(BUDGET_MS);
  try {
    const geo = await getJson<Geocoding>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`,
      signal,
    );
    const place = geo.results?.find((r) => r.timezone === timeZone);
    if (!place) return null;
    const sky = await getJson<Forecast>(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=sunset&timezone=auto&forecast_days=1`,
      signal,
    );
    // "2026-11-17T17:57": already in the place's local time.
    const iso = sky.daily.sunset[0];
    return iso ? { time: clock(iso.slice(11, 16)), place: place.name } : null;
  } catch {
    return null;
  }
}

/** The sunset once it arrives; null while loading or if the API couldn't answer in time. */
export function useSunset() {
  const [sunset, setSunset] = useState<Sunset | null>(null);
  useEffect(() => {
    let live = true;
    fetchSunset().then((s) => live && setSunset(s));
    return () => {
      live = false;
    };
  }, []);
  return sunset;
}
