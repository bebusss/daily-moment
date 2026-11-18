// Tonight's sky where the person is, from public REST APIs (no key, no signup, no location
// prompt), so the window can show it:
//
// - GeoJS: the city and its coordinates, from the connection, kept only if its time zone is the
//   device's (a VPN abroad, say, isn't). If not, Open-Meteo's geocoder turns the device's time
//   zone ("America/Mexico_City") into its city: right zone, maybe not the right city.
// - Open-Meteo's forecast: tonight's sunset and the weather now.
// - The US Naval Observatory: the moon's phase tonight at that place.
//
// The forecast and the moon run in parallel under one time budget. Each answer is kept on the
// device: the place for half a day, the sunset and the moon for the day, the weather for half an hour. If an API is slow
// or down, its part is simply missing and the window keeps its default evening and moon; nothing
// else waits for it. We ask as soon as this code loads in the browser.
//
// For showing it off: ?sky=rain or ?sky=clear, and ?moon=0.9 (how much of it is lit, 0 to 1).

import { useEffect, useState } from "react";

export type Sky = {
  place?: string;
  /** "5:57 pm", local time at the place. */
  sunset?: string;
  weather?: { rain: boolean; clouds: number; label: string };
  /** How much of the moon is lit (0 new, 1 full), and whether it's growing. */
  moon?: { lit: number; waxing: boolean; phase: string };
};

const BUDGET_MS = 15000;
const HOUR = 3600_000;

type Place = { name: string; latitude: number; longitude: number };
type GeoJs = { city?: string; latitude?: string; longitude?: string; timezone?: string };
type Geocoding = { results?: (Place & { timezone: string })[] };
type Forecast = {
  daily: { sunset: string[] };
  current?: { weather_code: number; cloud_cover: number; precipitation: number };
};
type Usno = { properties: { data: { curphase: string; fracillum: string } } };

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return (await res.json()) as T;
}

/** A value kept on the device under `key`, if it's younger than `maxAge`. */
function kept<T>(key: string, maxAge: number): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw) as { at: number; value: T };
    return Date.now() - at < maxAge ? value : null;
  } catch {
    return null;
  }
}

function keep<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {}
}

/** Kept if fresh, otherwise fetched (and kept). Never throws: a failure is just `undefined`. */
async function cached<T>(key: string, maxAge: number, fetch: () => Promise<T>): Promise<T | undefined> {
  const known = kept<T>(key, maxAge);
  if (known) return known;
  try {
    const value = await fetch();
    keep(key, value);
    return value;
  } catch {
    return undefined;
  }
}

/** "17:57" is "5:57 pm". */
function clock(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** WMO weather codes: drizzle, rain, showers, storms. */
function weatherOf(code: number, clouds: number, precipitation: number) {
  const rain = precipitation > 0 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
  const label =
    code >= 95
      ? "Storm"
      : code >= 80
        ? "Showers"
        : code >= 61
          ? "Rain"
          : code >= 51
            ? "Drizzle"
            : clouds > 70
              ? "Cloudy"
              : clouds > 30
                ? "Some clouds"
                : "Clear";
  return { rain, clouds: clouds / 100, label };
}

export async function fetchSky(zone = Intl.DateTimeFormat().resolvedOptions().timeZone): Promise<Sky> {
  const signal = AbortSignal.timeout(BUDGET_MS);
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local

  const place = await cached<Place>(`sky:place:v2:${zone}`, 12 * HOUR, async () => {
    // Where the connection is, if it's in the device's own time zone.
    try {
      const ip = await getJson<GeoJs>("https://get.geojs.io/v1/ip/geo.json", signal);
      const [latitude, longitude] = [Number(ip.latitude), Number(ip.longitude)];
      if (ip.city && ip.timezone === zone && Number.isFinite(latitude) && Number.isFinite(longitude)) return { name: ip.city, latitude, longitude };
    } catch {}
    // Otherwise the time zone's own city.
    const city = zone.split("/").pop()?.replaceAll("_", " ") ?? "";
    const geo = await getJson<Geocoding>(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`,
      signal,
    );
    const found = geo.results?.find((r) => r.timezone === zone);
    if (!found) throw new Error(`no place for ${zone}`);
    return { name: found.name, latitude: found.latitude, longitude: found.longitude };
  });
  if (!place) return {};
  const at = `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;

  const [evening, weather, moon] = await Promise.all([
    cached(`sky:sunset:${at}:${today}`, 24 * HOUR, async () => {
      const f = await getJson<Forecast>(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=sunset&timezone=auto&forecast_days=1`,
        signal,
      );
      return clock(f.daily.sunset[0].slice(11, 16));
    }),
    cached(`sky:weather:${at}`, HOUR / 2, async () => {
      const f = await getJson<Forecast>(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=weather_code,cloud_cover,precipitation&timezone=auto&forecast_days=1`,
        signal,
      );
      if (!f.current) throw new Error("no current weather");
      return weatherOf(f.current.weather_code, f.current.cloud_cover, f.current.precipitation);
    }),
    cached(`sky:moon:${at}:${today}`, 24 * HOUR, async () => {
      const tz = -new Date().getTimezoneOffset() / 60;
      const u = await getJson<Usno>(`https://aa.usno.navy.mil/api/rstt/oneday?date=${today}&coords=${at}&tz=${tz}`, signal);
      const { curphase, fracillum } = u.properties.data;
      return { lit: parseFloat(fracillum) / 100, waxing: /waxing|first quarter/i.test(curphase), phase: curphase };
    }),
  ]);
  return { place: place.name, sunset: evening, weather, moon };
}

/** ?sky=rain|clear and ?moon=0..1 override what the APIs said, for demos. */
function overridden(sky: Sky): Sky {
  const q = new URLSearchParams(window.location.search);
  const out = { ...sky };
  const s = q.get("sky");
  if (s === "rain") out.weather = { rain: true, clouds: 0.85, label: "Rain" };
  if (s === "clear") out.weather = { rain: false, clouds: 0, label: "Clear" };
  const m = q.get("moon");
  if (m !== null && !Number.isNaN(parseFloat(m))) out.moon = { lit: Math.min(1, Math.max(0, parseFloat(m))), waxing: true, phase: "Waxing" };
  return out;
}

let asked: Promise<Sky> | null = null;
const ask = () => (asked ??= fetchSky().then(overridden));
if (typeof window !== "undefined") ask();

/** Tonight's sky once it's known; empty until then (and for any part an API couldn't give). */
export function useSky(): Sky {
  const [sky, setSky] = useState<Sky>({});
  useEffect(() => {
    let live = true;
    ask().then((s) => live && setSky(s));
    return () => {
      live = false;
    };
  }, []);
  return sky;
}
