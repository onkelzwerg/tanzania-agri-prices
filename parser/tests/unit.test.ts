import { describe, expect, it } from "vitest";
import { recordsFromCsv, recordsToCsv } from "../src/csv";
import { extractWeek, normalizeDateText } from "../src/dates";
import { parseNum } from "../src/numbers";
import { findRegion } from "../src/regions";
import { calendarWeekFrom, isoDate, type PriceRecord } from "../src/types";

describe("extractWeek", () => {
  it("parses same-month ranges", () => {
    expect(extractWeek("02 - 06 December, 2024")).toEqual({
      weekStart: "02.12.2024",
      weekEnd: "06.12.2024",
    });
  });

  it("parses cross-month single-year ranges", () => {
    expect(extractWeek("28 April - 02 May, 2025")).toEqual({
      weekStart: "28.04.2025",
      weekEnd: "02.05.2025",
    });
  });

  it("parses cross-year ranges", () => {
    expect(extractWeek("29 December 2025 - 02 January 2026")).toEqual({
      weekStart: "29.12.2025",
      weekEnd: "02.01.2026",
    });
  });

  it("repairs missing spaces between day and month", () => {
    expect(extractWeek("25May - 29May, 2026")).toEqual({
      weekStart: "25.05.2026",
      weekEnd: "29.05.2026",
    });
  });

  it("strips ordinal suffixes", () => {
    expect(extractWeek("1st - 5th September, 2025")).toEqual({
      weekStart: "01.09.2025",
      weekEnd: "05.09.2025",
    });
  });

  it("handles a missing space after the comma (Jan 2025 bulletins)", () => {
    expect(extractWeek("13 -17 January,2025")).toEqual({
      weekStart: "13.01.2025",
      weekEnd: "17.01.2025",
    });
  });

  it("handles a comma after the first month name (Apr/May 2026 bulletins)", () => {
    expect(extractWeek("27 April, -01 May, 2026")).toEqual({
      weekStart: "27.04.2026",
      weekEnd: "01.05.2026",
    });
  });

  it("parses Swahili month names (mixed-language bulletins)", () => {
    expect(extractWeek("02-06 Juni, 2025")).toEqual({
      weekStart: "02.06.2025",
      weekEnd: "06.06.2025",
    });
    expect(extractWeek("30 March - 03 Aprili, 2026")).toEqual({
      weekStart: "30.03.2026",
      weekEnd: "03.04.2026",
    });
    expect(extractWeek("23-27 Machi, 2026")).toEqual({
      weekStart: "23.03.2026",
      weekEnd: "27.03.2026",
    });
  });

  it("returns null for text without a date range", () => {
    expect(extractWeek("Weekly Market Bulletin")).toBeNull();
  });
});

describe("normalizeDateText", () => {
  it("inserts spaces between digits and letters", () => {
    expect(normalizeDateText("25May")).toBe("25 May");
    expect(normalizeDateText("May25")).toBe("May 25");
  });
});

describe("parseNum", () => {
  it("parses plain and comma-separated numbers", () => {
    expect(parseNum("800")).toBe(800);
    expect(parseNum("2,300")).toBe(2300);
    expect(parseNum("7,597,740.00")).toBe(7597740);
  });

  it("parses numbers with stray internal spaces", () => {
    expect(parseNum("1 234")).toBe(1234);
    expect(parseNum("2, 300")).toBe(2300);
  });

  it("maps dashes and empty strings to null (missing = NULL, never 0)", () => {
    expect(parseNum("-")).toBeNull();
    expect(parseNum("–")).toBeNull();
    expect(parseNum("—")).toBeNull();
    expect(parseNum("")).toBeNull();
  });

  it("rejects non-numeric text", () => {
    expect(parseNum("abc")).toBeNull();
  });
});

describe("findRegion", () => {
  it("matches known regions including multi-word names", () => {
    expect(findRegion("Dodoma")).toBe("Dodoma");
    expect(findRegion("Dar es Salaam")).toBe("Dar es Salaam");
    expect(findRegion("dar es salaam ")).toBe("Dar es Salaam");
  });

  it("returns null for unknown text", () => {
    expect(findRegion("National Average")).toBeNull();
    expect(findRegion("Change")).toBeNull();
  });
});

describe("isoDate", () => {
  it("converts DD.MM.YYYY to YYYY-MM-DD", () => {
    expect(isoDate("04.05.2026")).toBe("2026-05-04");
  });
});

describe("recordsToCsv", () => {
  it("emits sorted long-format rows with empty cells for missing values", () => {
    const rec = (region: string, maize: number | null): PriceRecord => ({
      id: `04.05.2026__08.05.2026__${region.toLowerCase()}`,
      weekStart: "04.05.2026",
      weekEnd: "08.05.2026",
      calendarWeek: "KW 19 / 2026",
      region,
      maize,
      rice: 2300,
      beans: null,
      sorghum: 1600,
      bulrushMillet: null,
      fingerMillet: 2100,
      roundPotato: 900,
    });
    const csv = recordsToCsv([rec("Dodoma", 700), rec("Arusha", null)]);
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe("week_start,week_end,region,crop,price");
    // Arusha sorts before Dodoma; 7 rows each.
    expect(lines[1]).toBe("2026-05-04,2026-05-08,Arusha,maize,");
    expect(lines[2]).toBe("2026-05-04,2026-05-08,Arusha,rice,2300");
    expect(lines[3]).toBe("2026-05-04,2026-05-08,Arusha,beans,");
    expect(lines[8]).toBe("2026-05-04,2026-05-08,Dodoma,maize,700");
    expect(lines).toHaveLength(1 + 2 * 7);
    expect(csv).not.toMatch(/,0$/m);
  });
});

describe("recordsFromCsv", () => {
  it("round-trips recordsToCsv output back into records", () => {
    const rec: PriceRecord = {
      id: "04.05.2026__08.05.2026__dodoma",
      weekStart: "04.05.2026",
      weekEnd: "08.05.2026",
      calendarWeek: "KW 19 / 2026",
      region: "Dodoma",
      maize: 700,
      rice: 2900,
      beans: null,
      sorghum: 1600,
      bulrushMillet: null,
      fingerMillet: 2100,
      roundPotato: 700,
    };
    const [back] = recordsFromCsv(recordsToCsv([rec]));
    expect(back).toEqual(rec);
  });

  it("groups multiple weeks/regions and keeps missing values null", () => {
    const csv = [
      "week_start,week_end,region,crop,price",
      "2026-05-04,2026-05-08,Dar es Salaam,maize,900",
      "2026-05-04,2026-05-08,Dar es Salaam,round_potato,",
      "2026-05-11,2026-05-15,Arusha,maize,800",
    ].join("\n");
    const recs = recordsFromCsv(csv);
    expect(recs).toHaveLength(2);
    const dsm = recs.find((r) => r.region === "Dar es Salaam")!;
    expect(dsm.maize).toBe(900);
    expect(dsm.roundPotato).toBeNull();
    expect(dsm.weekStart).toBe("04.05.2026");
    expect(dsm.calendarWeek).toBe("KW 19 / 2026");
  });
});

describe("calendarWeekFrom", () => {
  it("computes ISO calendar weeks", () => {
    expect(calendarWeekFrom("01.09.2025")).toBe("KW 36 / 2025");
    expect(calendarWeekFrom("11.05.2026")).toBe("KW 20 / 2026");
  });

  it("assigns year-crossing weeks to the ISO week-year", () => {
    expect(calendarWeekFrom("29.12.2025")).toBe("KW 01 / 2026");
    expect(calendarWeekFrom("30.12.2024")).toBe("KW 01 / 2025");
  });
});
