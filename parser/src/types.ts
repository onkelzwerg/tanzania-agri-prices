export interface PriceRecord {
  id: string;
  weekStart: string; // DD.MM.YYYY
  weekEnd: string;
  calendarWeek: string; // e.g. "KW 49 / 2024"
  region: string;
  maize: number | null;
  rice: number | null;
  beans: number | null;
  sorghum: number | null;
  bulrushMillet: number | null;
  fingerMillet: number | null;
  roundPotato: number | null;
}

export const CROP_KEYS = [
  "maize",
  "rice",
  "beans",
  "sorghum",
  "bulrushMillet",
  "fingerMillet",
  "roundPotato",
] as const;

export type CropKey = (typeof CROP_KEYS)[number];

export const CROP_LABELS: Record<CropKey, string> = {
  maize: "Maize",
  rice: "Rice",
  beans: "Beans",
  sorghum: "Sorghum",
  bulrushMillet: "Bulrush Millet",
  fingerMillet: "Finger Millet",
  roundPotato: "Round Potato",
};

/** Parse "DD.MM.YYYY" -> "YYYY-MM-DD" */
export function isoDate(s: string): string {
  const [d, m, y] = s.split(".");
  return `${y}-${m}-${d}`;
}

/** Parse "YYYY-MM-DD" -> "DD.MM.YYYY" */
export function fromIsoDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}

/** Derive ISO calendar week from "DD.MM.YYYY" -> "KW 49 / 2024" */
export function calendarWeekFrom(weekStart: string): string {
  const [d, m, y] = weekStart.split(".").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // ISO week algorithm
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date.getTime() - firstThursday.getTime()) / 86400000;
  const week = 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `KW ${String(week).padStart(2, "0")} / ${date.getUTCFullYear()}`;
}
