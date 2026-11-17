// Names the heavy work in the browser's performance timeline (DevTools > Performance, or
// performance.getEntriesByType("measure")), so it can be measured instead of guessed at.

export function timed<T>(name: string, work: () => T): T {
  if (typeof performance === "undefined" || typeof performance.measure !== "function") return work();
  const start = performance.now();
  const out = work();
  performance.measure(name, { start, end: performance.now() });
  return out;
}
