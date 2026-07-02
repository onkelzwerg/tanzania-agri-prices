# tanzania-agri-prices-parser

Extracts structured weekly price records from Tanzanian Ministry of Agriculture
**Weekly Market Bulletin** PDFs. No DOM dependency — runs in the browser
(bundled by Vite) and in Node.

## Library

```ts
import { extractRecords, recordsToCsv } from "tanzania-agri-prices-parser";

const { week, records } = await extractRecords(bytes); // bytes: ArrayBuffer | Uint8Array
const csv = recordsToCsv(records);                     // long-format CSV
```

- `extractRecords(data)` → `{ week, records }`. Reads Table 1 (National Average)
  and Table 2 (regions), the "Current" rows only.
- `recordsToCsv(records)` / `recordsFromCsv(text)` — long-format
  (`week_start,week_end,region,crop,price`) serialization used by the data repo.
- `setPdfWorkerPort(worker)` — in the browser, register the pdfjs web worker
  before extracting (Node uses the built-in fake worker automatically).

Helpers are also exported: `extractWeek`, `parseNum`, `findRegion`,
`calendarWeekFrom`, `isoDate`, `fromIsoDate`, `CROP_KEYS`, `CROP_LABELS`.

### Robustness

- **Column assignment by x-coordinate clustering**, not token order — a missing
  middle cell does not shift the rest of the row.
- **Hard failures with descriptive errors** (instead of wrong-but-plausible data)
  for rotated pages, a missing week header, or an unexpected column count.
- Handles English/Swahili month names, fused dates ("25May"), split number
  fragments ("2," + "300") and thousands separators.

## CLI

```bash
bun run pdf-to-csv --out <dir> bulletin.pdf [more.pdf...]
```

Writes `<week_start>.csv` per bulletin into `<dir>` and prints a JSON provenance
line (source file, SHA-256) per PDF for the data repo's `provenance.csv`.

## Tests & fixtures

```bash
bun run test                                  # Vitest
bun run make-fixtures                         # regenerate synthetic fixture PDFs
REAL_BULLETIN_PDF=/path/to.pdf bun run test   # opt-in smoke test on a real bulletin
```

Fixtures are generated with `pdf-lib` in `tests/fixtures/generate.ts`, mimicking
real bulletin layouts (center-aligned columns, Current/Previous/Change rows).
To cover a new layout variant, add a case there, run `make-fixtures`, and assert
against it in `tests/extract.test.ts`.
