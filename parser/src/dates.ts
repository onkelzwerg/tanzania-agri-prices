// English and Swahili month names — bulletins mix both ("30 March - 03 Aprili, 2026").
const MONTHS: Record<string, string> = {
  jan: "01",
  january: "01",
  januari: "01",
  feb: "02",
  february: "02",
  februari: "02",
  mar: "03",
  march: "03",
  machi: "03",
  apr: "04",
  april: "04",
  aprili: "04",
  may: "05",
  mei: "05",
  jun: "06",
  june: "06",
  juni: "06",
  jul: "07",
  july: "07",
  julai: "07",
  aug: "08",
  august: "08",
  agosti: "08",
  sep: "09",
  sept: "09",
  september: "09",
  septemba: "09",
  oct: "10",
  october: "10",
  oktoba: "10",
  nov: "11",
  november: "11",
  novemba: "11",
  dec: "12",
  december: "12",
  desemba: "12",
};

const pad = (n: string | number) => String(n).padStart(2, "0");

function stripOrdinals(s: string): string {
  return s.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
}

/**
 * Normalize date text: strip ordinals + insert missing spaces between digits
 * and letters ("25May") and after commas ("January,2025").
 */
export function normalizeDateText(s: string): string {
  return stripOrdinals(s)
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/,(\S)/g, ", $1");
}

export interface WeekRange {
  weekStart: string; // DD.MM.YYYY
  weekEnd: string; // DD.MM.YYYY
}

/** Parse a "02 - 06 December, 2024" style date range (several bulletin variants). */
export function extractWeek(text: string): WeekRange | null {
  const t = normalizeDateText(text);

  // Cross-year: "29 December 2024 - 03 January 2025"
  const b = t.match(
    /(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})\s*[-–—to]+\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/,
  );
  if (b) {
    const m1 = MONTHS[b[2].toLowerCase()];
    const m2 = MONTHS[b[5].toLowerCase()];
    if (m1 && m2) {
      return {
        weekStart: `${pad(b[1])}.${m1}.${b[3]}`,
        weekEnd: `${pad(b[4])}.${m2}.${b[6]}`,
      };
    }
  }

  // Cross-month single-year: "04 May - 08 May, 2026" (some bulletins also put a
  // comma after the first month: "27 April, -01 May, 2026").
  const c = t.match(/(\d{1,2})\s+([A-Za-z]+),?\s*[-–—to]+\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (c) {
    const m1 = MONTHS[c[2].toLowerCase()];
    const m2 = MONTHS[c[4].toLowerCase()];
    if (m1 && m2) {
      return {
        weekStart: `${pad(c[1])}.${m1}.${c[5]}`,
        weekEnd: `${pad(c[3])}.${m2}.${c[5]}`,
      };
    }
  }

  // Same-month: "02 - 06 December, 2024"
  const a = t.match(/(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (a) {
    const m = MONTHS[a[3].toLowerCase()];
    if (m) {
      return {
        weekStart: `${pad(a[1])}.${m}.${a[4]}`,
        weekEnd: `${pad(a[2])}.${m}.${a[4]}`,
      };
    }
  }

  return null;
}
