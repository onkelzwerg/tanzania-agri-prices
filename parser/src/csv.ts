import type { CropKey, PriceRecord } from "./types";
import { calendarWeekFrom, CROP_KEYS, fromIsoDate, isoDate } from "./types";

/** snake_case crop names used in the published CSV files. */
export const CSV_CROPS: Record<CropKey, string> = {
  maize: "maize",
  rice: "rice",
  beans: "beans",
  sorghum: "sorghum",
  bulrushMillet: "bulrush_millet",
  fingerMillet: "finger_millet",
  roundPotato: "round_potato",
};

const CROP_BY_CSV_NAME = new Map<string, CropKey>(CROP_KEYS.map((key) => [CSV_CROPS[key], key]));

export const CSV_HEADER = "week_start,week_end,region,crop,price";

/**
 * Serialize one bulletin week as the long-format CSV published in the data
 * repo: one row per region and crop, ISO dates, empty price = not reported
 * (never 0). Rows are sorted (region, then canonical crop order) so the
 * output is deterministic.
 */
export function recordsToCsv(records: PriceRecord[]): string {
  const sorted = [...records].sort((a, b) => a.region.localeCompare(b.region, "en"));
  const lines = [CSV_HEADER];
  for (const r of sorted) {
    const start = isoDate(r.weekStart);
    const end = isoDate(r.weekEnd);
    for (const key of CROP_KEYS) {
      const price = r[key];
      lines.push(`${start},${end},${r.region},${CSV_CROPS[key]},${price ?? ""}`);
    }
  }
  return lines.join("\n") + "\n";
}

/**
 * Parse the long-format CSV (as published in the data repo, single or combined
 * file) back into PriceRecord[]. Rows are grouped by (week_start, week_end,
 * region); an empty price stays null (never 0). Unknown crop names and blank
 * lines are ignored. Region names contain no commas, so a plain split is safe.
 */
export function recordsFromCsv(text: string): PriceRecord[] {
  const lines = text.split(/\r?\n/);
  const byRecord = new Map<string, PriceRecord>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === "" || line === CSV_HEADER) continue;
    const cols = line.split(",");
    if (cols.length !== 5) throw new Error(`CSV line ${i + 1}: expected 5 columns`);
    const [startIso, endIso, region, cropName, priceStr] = cols;
    const crop = CROP_BY_CSV_NAME.get(cropName);
    if (!crop) continue;

    const weekStart = fromIsoDate(startIso);
    const weekEnd = fromIsoDate(endIso);
    const id = `${weekStart}__${weekEnd}__${region.toLowerCase()}`;
    let rec = byRecord.get(id);
    if (!rec) {
      rec = {
        id,
        weekStart,
        weekEnd,
        calendarWeek: calendarWeekFrom(weekStart),
        region,
        maize: null,
        rice: null,
        beans: null,
        sorghum: null,
        bulrushMillet: null,
        fingerMillet: null,
        roundPotato: null,
      };
      byRecord.set(id, rec);
    }
    rec[crop] = priceStr === "" ? null : Number(priceStr);
  }

  return Array.from(byRecord.values());
}
