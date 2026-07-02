/**
 * CLI: extract one or more bulletin PDFs and write one long-format CSV per
 * week, named data/raw/<year>/<week_start>.csv-style (<week_start>.csv into
 * --out). Prints a provenance line (JSON) per PDF for data/provenance.csv.
 *
 *   bun scripts/pdf-to-csv.ts --out <dir> <bulletin.pdf> [more.pdf...]
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, join } from "node:path";
import { extractRecords } from "../src/extract";
import { recordsToCsv } from "../src/csv";
import { isoDate } from "../src/types";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
if (outIdx === -1 || !args[outIdx + 1]) {
  console.error("Usage: bun scripts/pdf-to-csv.ts --out <dir> <bulletin.pdf> [more.pdf...]");
  process.exit(1);
}
const outDir = args[outIdx + 1];
const pdfs = args.filter((_, i) => i !== outIdx && i !== outIdx + 1);
if (pdfs.length === 0) {
  console.error("No PDF files given.");
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

let failed = false;
for (const pdf of pdfs) {
  try {
    const buf = await readFile(pdf);
    const { week, records } = await extractRecords(new Uint8Array(buf));
    const weekStart = isoDate(week.weekStart);
    const outPath = join(outDir, `${weekStart}.csv`);
    await writeFile(outPath, recordsToCsv(records));
    console.error(`${outPath}: ${records.length} regions`);
    console.log(
      JSON.stringify({
        week_start: weekStart,
        source_file: basename(pdf),
        source_sha256: createHash("sha256").update(buf).digest("hex"),
      }),
    );
  } catch (err) {
    failed = true;
    console.error(`FAILED ${pdf}: ${(err as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
