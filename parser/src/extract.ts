import type { PriceRecord } from "./types";
import { calendarWeekFrom, CROP_KEYS } from "./types";
import { extractWeek, type WeekRange } from "./dates";
import { NUM_OR_DASH, parseNum } from "./numbers";
import { findRegion } from "./regions";

/**
 * pdfjs-dist is imported lazily and from the `legacy` build so the same code
 * path works in the browser (bundled by Vite) and in Node (tests) — and so
 * importing this module never evaluates pdfjs during SSR.
 */
type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | undefined;

function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist/legacy/build/pdf.mjs") as Promise<PdfjsModule>;
  }
  return pdfjsPromise;
}

/**
 * Register the web worker that pdfjs should use. Call once from browser code
 * before extracting (Vite: `import Worker from ".../pdf.worker.min.mjs?worker"`).
 * In Node, pdfjs falls back to its built-in fake worker — no call needed.
 */
export async function setPdfWorkerPort(port: Worker): Promise<void> {
  const pdfjs = await loadPdfjs();
  pdfjs.GlobalWorkerOptions.workerPort = port;
}

export interface ExtractResult {
  week: WeekRange;
  records: PriceRecord[];
}

interface Token {
  /** Horizontal center of the text item — cells are center-aligned per column. */
  center: number;
  x: number;
  str: string;
}

interface Row {
  tokens: Token[];
  text: string;
}

/** Fragments that a PDF sometimes splits a single number into ("2," + "300"). */
const NUMERIC_FRAGMENT = /^[\d.,]+$/;
/** Max gap (px) between two items that belong to the same number. */
const FRAGMENT_MERGE_GAP = 2.5;
/** Min distance (px) between two distinct value columns (real spacing is ~70). */
const COLUMN_GAP = 25;

interface TextItemLike {
  str: string;
  width: number;
  transform: number[];
}

/** Group a page's text items into visual rows (top to bottom, left to right). */
function buildRows(items: TextItemLike[]): Row[] {
  const buckets = new Map<number, Array<{ x: number; width: number; str: string }>>();
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    let key = y;
    for (const existing of buckets.keys()) {
      if (Math.abs(existing - y) <= 2) {
        key = existing;
        break;
      }
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({ x: it.transform[4], width: it.width, str: it.str });
  }

  const ys = Array.from(buckets.keys()).sort((a, b) => b - a);
  const rows: Row[] = [];
  for (const y of ys) {
    const parts = buckets.get(y)!.sort((a, b) => a.x - b.x);

    // Re-join numbers that the PDF split into adjacent fragments.
    const merged: Array<{ x: number; width: number; str: string }> = [];
    for (const part of parts) {
      const prev = merged[merged.length - 1];
      const gap = prev ? part.x - (prev.x + prev.width) : Infinity;
      if (
        prev &&
        gap <= FRAGMENT_MERGE_GAP &&
        NUMERIC_FRAGMENT.test(prev.str) &&
        NUMERIC_FRAGMENT.test(part.str)
      ) {
        prev.str += part.str;
        prev.width = part.x + part.width - prev.x;
      } else {
        merged.push({ ...part });
      }
    }

    const tokens: Token[] = merged.map((p) => ({
      center: p.x + p.width / 2,
      x: p.x,
      str: p.str.trim(),
    }));
    const text = tokens
      .map((t) => t.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) rows.push({ tokens, text });
  }
  return rows;
}

/**
 * Find the bulletin's current week. Prefers the "Current week ..." table
 * header; some bulletin variants omit it, then the document title
 * ("Weekly Market Bulletin 18 – 22 May, 2026") is the only date source.
 * Never reads free-standing date ranges — those may be the previous week.
 */
function findCurrentWeek(rows: Row[]): WeekRange {
  for (const row of rows) {
    const m = row.text.match(/current week\s*:?\s*(.+?)(?=previous week|table\s+\d|$)/i);
    if (m) {
      const week = extractWeek(m[1]);
      if (week) return week;
    }
  }
  for (const row of rows) {
    const m = row.text.match(/market bulletin\s*(.+)$/i);
    if (m) {
      const week = extractWeek(m[1]);
      if (week) return week;
    }
  }
  throw new Error(
    'Could not find the current week dates (neither a "Current week" header ' +
      "nor a dated bulletin title). The PDF may have an unexpected layout.",
  );
}

interface DataRow {
  /** Joined text before the Current/Previous marker (the region label, if any). */
  prefix: string;
  marker: "current" | "previous";
  /** Numeric/dash cell tokens after the marker. */
  values: Token[];
}

/** Split a row into region prefix, Current/Previous marker and cell values. */
function toDataRow(row: Row): DataRow | null {
  const idx = row.tokens.findIndex((t) => /^(current|previous)$/i.test(t.str));
  if (idx === -1) return null;
  const values = row.tokens.slice(idx + 1).filter((t) => NUM_OR_DASH.test(t.str));
  if (values.length === 0) return null;
  return {
    prefix: row.tokens
      .slice(0, idx)
      .map((t) => t.str)
      .join(" ")
      .trim(),
    marker: row.tokens[idx].str.toLowerCase() as DataRow["marker"],
    values,
  };
}

/**
 * Derive the 7 crop-column centers of a table by clustering the x-centers of
 * every cell (Current and Previous rows alike). Cells are center-aligned, so
 * centers of one column stay within a few px while columns are ~70 px apart.
 */
function clusterColumns(dataRows: DataRow[], tableNo: number): number[] {
  const centers = dataRows.flatMap((r) => r.values.map((v) => v.center)).sort((a, b) => a - b);

  const clusters: Array<{ sum: number; count: number }> = [];
  for (const c of centers) {
    const last = clusters[clusters.length - 1];
    if (last && c - last.sum / last.count <= COLUMN_GAP) {
      last.sum += c;
      last.count++;
    } else {
      clusters.push({ sum: c, count: 1 });
    }
  }
  const means = clusters.map((cl) => cl.sum / cl.count);

  if (means.length !== CROP_KEYS.length) {
    throw new Error(
      `Table ${tableNo}: found ${means.length} value columns, expected ${CROP_KEYS.length}. ` +
        "The table layout differs from known bulletins; refusing to guess column positions.",
    );
  }
  return means;
}

/** Assign a row's cells to crop columns by nearest column center. */
function assignValues(row: DataRow, columns: number[], tableNo: number): (number | null)[] {
  const vals: (number | null)[] = new Array(columns.length).fill(null);
  for (const token of row.values) {
    let best = 0;
    for (let i = 1; i < columns.length; i++) {
      if (Math.abs(token.center - columns[i]) < Math.abs(token.center - columns[best])) {
        best = i;
      }
    }
    if (vals[best] !== null) {
      throw new Error(
        `Table ${tableNo}: two cells ("${row.prefix || "National Average"}" row) map to the same ` +
          "column. The table layout differs from known bulletins.",
      );
    }
    vals[best] = parseNum(token.str);
  }
  return vals;
}

function buildRecord(week: WeekRange, region: string, vals: (number | null)[]): PriceRecord {
  return {
    id: `${week.weekStart}__${week.weekEnd}__${region.toLowerCase()}`,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    calendarWeek: calendarWeekFrom(week.weekStart),
    region,
    maize: vals[0],
    rice: vals[1],
    beans: vals[2],
    sorghum: vals[3],
    bulrushMillet: vals[4],
    fingerMillet: vals[5],
    roundPotato: vals[6],
  };
}

/**
 * Extract the week and all "Current" price rows (Table 1: National Average,
 * Table 2: regions) from a weekly Ministry of Agriculture market bulletin.
 *
 * Throws with a descriptive message when the PDF does not look like a known
 * bulletin layout (rotated pages, missing "Current week" header, unexpected
 * column count) instead of returning wrong-but-plausible data.
 */
export async function extractRecords(data: ArrayBuffer | Uint8Array): Promise<ExtractResult> {
  const pdfjs = await loadPdfjs();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const pdf = await pdfjs.getDocument({ data: bytes, verbosity: 0 }).promise;

  const allRows: Row[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    if (page.rotate % 180 !== 0) {
      throw new Error(
        `Page ${p} is rotated by ${page.rotate}°. Rotated bulletin layouts are not supported.`,
      );
    }
    const content = await page.getTextContent();
    allRows.push(...buildRows(content.items as TextItemLike[]));
  }

  const week = findCurrentWeek(allRows);

  // Segment rows by "Table N:" markers; tables 1 and 2 hold the price data.
  const sections = new Map<number, Row[]>();
  let section = 0;
  for (const row of allRows) {
    const tableMatch = row.text.match(/^Table\s+(\d+)\s*:/i);
    if (tableMatch) {
      section = parseInt(tableMatch[1], 10);
      continue;
    }
    if (section === 1 || section === 2) {
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section)!.push(row);
    }
  }

  const records = new Map<string, PriceRecord>();

  for (const [tableNo, rows] of sections) {
    const dataRows = rows.map(toDataRow).filter((r): r is DataRow => r !== null);
    if (dataRows.length === 0) continue;
    const columns = clusterColumns(dataRows, tableNo);

    for (const row of dataRows) {
      if (row.marker !== "current") continue;
      const region = tableNo === 1 ? "National Average" : findRegion(row.prefix);
      if (!region) continue;
      const rec = buildRecord(week, region, assignValues(row, columns, tableNo));
      records.set(rec.id, rec);
    }
  }

  if (records.size === 0) {
    throw new Error(
      "No price rows found in Table 1/Table 2. The PDF may not be a weekly market bulletin.",
    );
  }

  return { week, records: Array.from(records.values()) };
}
