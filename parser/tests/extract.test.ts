import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { extractRecords } from "../src/extract";
import type { PriceRecord } from "../src/types";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

async function extractFixture(name: string) {
  const data = await readFile(join(FIXTURES, name));
  return extractRecords(new Uint8Array(data));
}

function byRegion(records: PriceRecord[]): Map<string, PriceRecord> {
  return new Map(records.map((r) => [r.region, r]));
}

describe("extractRecords", () => {
  it("extracts the current week and all Current rows from a normal bulletin", async () => {
    const { week, records } = await extractFixture("normal.pdf");
    expect(week).toEqual({ weekStart: "04.05.2026", weekEnd: "08.05.2026" });

    const map = byRegion(records);
    expect([...map.keys()].sort()).toEqual([
      "Dar es Salaam",
      "Dodoma",
      "Mwanza",
      "National Average",
    ]);

    expect(map.get("National Average")).toMatchObject({
      id: "04.05.2026__08.05.2026__national average",
      calendarWeek: "KW 19 / 2026",
      maize: 800,
      rice: 2300,
      beans: 2100,
      sorghum: 1600,
      bulrushMillet: 1600,
      fingerMillet: 2100,
      roundPotato: 900,
    });

    // Dash cells become null, never 0.
    expect(map.get("Dodoma")).toMatchObject({ sorghum: null, bulrushMillet: 1400 });
    expect(map.get("Dar es Salaam")).toMatchObject({ roundPotato: null, sorghum: 1300 });

    // A fully dashed Current row yields an all-null record.
    const mwanza = map.get("Mwanza")!;
    expect(mwanza.maize).toBeNull();
    expect(mwanza.roundPotato).toBeNull();
  });

  it("assigns values by column position when a middle cell is missing entirely", async () => {
    const { records } = await extractFixture("missing-middle-cell.pdf");
    const map = byRegion(records);

    // Sorghum cell absent (not even a dash): values after the gap must NOT
    // shift left — the historical takeSevenValues bug.
    expect(map.get("Dodoma")).toMatchObject({
      maize: 700,
      rice: 2900,
      beans: 2000,
      sorghum: null,
      bulrushMillet: 1400,
      fingerMillet: 2100,
      roundPotato: 700,
    });

    // Missing last cell stays null.
    expect(map.get("Arusha")).toMatchObject({
      fingerMillet: 2300,
      roundPotato: null,
    });
  });

  it("repairs fused date strings in the week header", async () => {
    const { week } = await extractFixture("fused-dates.pdf");
    expect(week).toEqual({ weekStart: "25.05.2026", weekEnd: "29.05.2026" });
  });

  it("handles year-crossing weeks", async () => {
    const { week, records } = await extractFixture("year-cross.pdf");
    expect(week).toEqual({ weekStart: "29.12.2025", weekEnd: "02.01.2026" });
    expect(records[0].calendarWeek).toBe("KW 01 / 2026");
  });

  it("merges numbers that the PDF split into adjacent fragments", async () => {
    const { records } = await extractFixture("split-numbers.pdf");
    expect(byRegion(records).get("Dodoma")).toMatchObject({ rice: 2900 });
  });

  it("falls back to the dated document title when the week header is missing", async () => {
    const { week, records } = await extractFixture("title-week-only.pdf");
    expect(week).toEqual({ weekStart: "18.05.2026", weekEnd: "22.05.2026" });
    expect(records.length).toBeGreaterThan(0);
  });

  it("rejects rotated pages instead of returning wrong data", async () => {
    await expect(extractFixture("rotated.pdf")).rejects.toThrow(/rotated/i);
  });

  it("rejects bulletins without a 'Current week' header instead of guessing", async () => {
    await expect(extractFixture("no-current-week.pdf")).rejects.toThrow(/current week/i);
  });
});
