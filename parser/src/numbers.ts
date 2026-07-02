/**
 * A table cell value: a dash placeholder ("data not available" per the
 * bulletin's legend) or a number that may contain thousands separators —
 * commas or, in some layouts, stray spaces ("1 234").
 */
export const NUM_OR_DASH = /^(?:[-–—]|\d[\d,\s]*(?:\.\d+)?)$/;

/** Parse a cell value; dashes and empty strings mean "not reported" -> null. */
export function parseNum(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[,\s]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "–" || cleaned === "—") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
