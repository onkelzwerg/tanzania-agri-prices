/**
 * Opt-in smoke test against a real ministry bulletin (not committed to the
 * repo). Run with:
 *
 *   REAL_BULLETIN_PDF="/path/to/bulletin.pdf" bun run test
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { extractRecords } from "../src/extract";

const pdfPath = process.env.REAL_BULLETIN_PDF;

describe.skipIf(!pdfPath)("real bulletin", () => {
  it("extracts a national average and regional rows", async () => {
    const data = await readFile(pdfPath!);
    const { week, records } = await extractRecords(new Uint8Array(data));

    expect(week.weekStart).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(records.length).toBeGreaterThan(10);
    expect(records.some((r) => r.region === "National Average")).toBe(true);
    for (const r of records) {
      expect(r.id).toContain(r.region.toLowerCase());
    }
  });
});
