/**
 * Generates the synthetic fixture PDFs used by the extract tests.
 *
 * The layouts mimic real Ministry of Agriculture weekly bulletins: cell values
 * are center-aligned per crop column (~70 px column spacing), each region has
 * Current/Previous/Change rows, and price tables are marked "Table 1:" /
 * "Table 2:". Regenerate with `bun run make-fixtures`.
 */
import { PDFDocument, StandardFonts, degrees, type PDFFont, type PDFPage } from "pdf-lib";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = dirname(fileURLToPath(import.meta.url));
const SIZE = 9;

// Column centers measured from a real bulletin (Table 2).
const COLS = [276, 343, 416, 490, 564, 631, 706];
const HEADERS = [
  "Maize",
  "Rice",
  "Beans",
  "Sorghum",
  "Bulrush millet",
  "Finger millet",
  "Round Potato",
];

let font: PDFFont;

function drawLeft(page: PDFPage, text: string, x: number, y: number) {
  page.drawText(text, { x, y, size: SIZE, font });
}

function drawCentered(page: PDFPage, text: string, centerX: number, y: number) {
  const w = font.widthOfTextAtSize(text, SIZE);
  page.drawText(text, { x: centerX - w / 2, y, size: SIZE, font });
}

/** Draw a Current/Previous data row; `null` cells are omitted entirely, "-" cells drawn as dash. */
function drawDataRow(
  page: PDFPage,
  region: string | null,
  marker: "Current" | "Previous",
  cells: Array<string | null>,
  y: number,
) {
  if (region) drawLeft(page, region, 74, y);
  drawLeft(page, marker, 163, y);
  cells.forEach((c, i) => {
    if (c !== null) drawCentered(page, c, COLS[i], y);
  });
}

function drawChangeRow(page: PDFPage, y: number) {
  COLS.forEach((c) => drawCentered(page, "0.0%", c, y));
  drawLeft(page, "Change", 163, y);
}

function drawColumnHeaders(page: PDFPage, y: number, withRegion: boolean) {
  if (withRegion) drawLeft(page, "Region", 74, y);
  drawLeft(page, "Week", 163, y);
  // Header positions intentionally do NOT align with value columns (as in real
  // bulletins) — the parser must cluster the values themselves.
  HEADERS.forEach((h, i) => drawLeft(page, h, 220 + i * 71, y));
}

function drawWeekHeader(page: PDFPage, y: number, previous: string, current: string) {
  drawLeft(page, "Previous week", 74, y);
  drawLeft(page, previous, 214, y);
  drawLeft(page, "Current week", 363, y);
  drawLeft(page, current, 462, y);
}

interface RegionRow {
  region: string;
  current: Array<string | null>;
  previous: Array<string | null>;
}

async function makeBulletin(opts: {
  file: string;
  previousWeek: string;
  currentWeek: string;
  omitCurrentWeekLabel?: boolean;
  /** Append the date range to the document title (some variants carry it only there). */
  dateInTitle?: boolean;
  rotate?: number;
  regions: RegionRow[];
  splitNumberCell?: { region: string; col: number; parts: [string, string] };
}) {
  const doc = await PDFDocument.create();
  font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([842, 792]);
  if (opts.rotate) page.setRotation(degrees(opts.rotate));

  let y = 740;
  const title = opts.dateInTitle
    ? `Weekly Market Bulletin ${opts.currentWeek}`
    : "United Republic of Tanzania - Weekly Market Bulletin";
  drawLeft(page, title, 300, y);
  y -= 25;

  // ----- Table 1 -----
  drawLeft(page, "Table 1: National weekly average wholesale prices (TZS/kg)", 72, y);
  y -= 16;
  if (opts.omitCurrentWeekLabel) {
    drawLeft(page, opts.currentWeek, 462, y);
  } else {
    drawWeekHeader(page, y, opts.previousWeek, opts.currentWeek);
  }
  y -= 15;
  drawColumnHeaders(page, y, false);
  y -= 15;
  drawLeft(page, "National Average", 80, y - 6);
  drawDataRow(
    page,
    null,
    "Current",
    ["800", "2,300", "2,100", "1,600", "1,600", "2,100", "900"],
    y,
  );
  y -= 14;
  drawDataRow(
    page,
    null,
    "Previous",
    ["800", "2,400", "2,100", "1,700", "1,600", "2,200", "900"],
    y,
  );
  y -= 14;
  drawChangeRow(page, y);
  y -= 25;

  // ----- Table 2 -----
  drawLeft(page, "Table 2: Regional weekly average wholesale market prices (TZS/ kg)", 72, y);
  y -= 16;
  drawColumnHeaders(page, y, true);
  y -= 15;
  for (const r of opts.regions) {
    if (opts.splitNumberCell && opts.splitNumberCell.region === r.region) {
      // Draw all cells except the split one, then the split one as two
      // adjacent fragments (as some bulletins encode numbers).
      const { col, parts } = opts.splitNumberCell;
      const cells = r.current.map((c, i) => (i === col ? null : c));
      drawDataRow(page, r.region, "Current", cells, y);
      const w0 = font.widthOfTextAtSize(parts[0], SIZE);
      const total = w0 + font.widthOfTextAtSize(parts[1], SIZE);
      const x0 = COLS[col] - total / 2;
      page.drawText(parts[0], { x: x0, y, size: SIZE, font });
      page.drawText(parts[1], { x: x0 + w0 + 0.5, y, size: SIZE, font });
    } else {
      drawDataRow(page, r.region, "Current", r.current, y);
    }
    y -= 14;
    drawDataRow(page, null, "Previous", r.previous, y);
    y -= 14;
    drawChangeRow(page, y);
    y -= 15;
  }

  // ----- Table 3 (must be ignored by the parser) -----
  drawLeft(page, "Table 3: Cocoa sales for the trade season", 72, y);
  y -= 15;
  drawLeft(page, "Mbeya", 76, y);
  drawLeft(page, "Current", 163, y);
  drawCentered(page, "10,916.00", 350, y);
  drawCentered(page, "7,597,740.00", 500, y);

  await writeFile(join(OUT_DIR, opts.file), await doc.save());
  console.log("wrote", opts.file);
}

const FULL: RegionRow[] = [
  {
    region: "Dodoma",
    current: ["700", "2,900", "2,000", "-", "1,400", "2,100", "700"],
    previous: ["700", "3,000", "2,100", "-", "1,400", "2,100", "700"],
  },
  {
    region: "Dar es Salaam",
    current: ["900", "2,900", "2,800", "1,300", "1,300", "2,300", "-"],
    previous: ["1,100", "3,200", "2,900", "-", "-", "-", "700"],
  },
  {
    region: "Mwanza",
    current: ["-", "-", "-", "-", "-", "-", "-"],
    previous: ["900", "2,400", "2,400", "1,600", "1,500", "2,300", "-"],
  },
];

await makeBulletin({
  file: "normal.pdf",
  previousWeek: "27 April - 01 May, 2026",
  currentWeek: "04 May - 08 May, 2026",
  regions: FULL,
});

await makeBulletin({
  file: "missing-middle-cell.pdf",
  previousWeek: "27 April - 01 May, 2026",
  currentWeek: "04 May - 08 May, 2026",
  regions: [
    {
      region: "Dodoma",
      // Sorghum cell missing ENTIRELY (no dash!) — a naive token-order parser
      // would shift bulrush/finger/potato one column to the left.
      current: ["700", "2,900", "2,000", null, "1,400", "2,100", "700"],
      previous: ["700", "3,000", "2,100", "-", "1,400", "2,100", "700"],
    },
    {
      region: "Arusha",
      // Last cell missing entirely.
      current: ["800", "2,900", "2,100", "1,300", "-", "2,300", null],
      previous: ["800", "2,900", "2,100", "1,300", "-", "2,300", "1,000"],
    },
  ],
});

await makeBulletin({
  file: "fused-dates.pdf",
  previousWeek: "18May - 22May, 2026",
  currentWeek: "25May - 29May, 2026",
  regions: FULL.slice(0, 1),
});

await makeBulletin({
  file: "year-cross.pdf",
  previousWeek: "22 December 2025 - 26 December 2025",
  currentWeek: "29 December 2025 - 02 January 2026",
  regions: FULL.slice(0, 1),
});

await makeBulletin({
  file: "split-numbers.pdf",
  previousWeek: "27 April - 01 May, 2026",
  currentWeek: "04 May - 08 May, 2026",
  regions: FULL.slice(0, 1),
  splitNumberCell: { region: "Dodoma", col: 1, parts: ["2,", "900"] },
});

await makeBulletin({
  file: "title-week-only.pdf",
  previousWeek: "11 - 15 May, 2026",
  currentWeek: "18 - 22 May, 2026",
  omitCurrentWeekLabel: true,
  dateInTitle: true,
  regions: FULL.slice(0, 2),
});

await makeBulletin({
  file: "rotated.pdf",
  previousWeek: "27 April - 01 May, 2026",
  currentWeek: "04 May - 08 May, 2026",
  rotate: 90,
  regions: FULL.slice(0, 1),
});

await makeBulletin({
  file: "no-current-week.pdf",
  previousWeek: "27 April - 01 May, 2026",
  currentWeek: "04 May - 08 May, 2026",
  omitCurrentWeekLabel: true,
  regions: FULL.slice(0, 1),
});
