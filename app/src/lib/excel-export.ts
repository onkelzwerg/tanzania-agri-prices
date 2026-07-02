import ExcelJS from "exceljs";
import type { PriceRecord } from "./types";
import { isoDate } from "./types";

const HEADERS = [
  "Week_Start",
  "Week_End",
  "Calendar_Week",
  "Region",
  "Maize",
  "Rice",
  "Beans",
  "Sorghum",
  "Bulrush_Millet",
  "Finger_Millet",
  "Round_Potato",
];

const FIRST_PRICE_COL = 5; // 1-based index of first numeric column

function toRow(r: PriceRecord) {
  return [
    r.weekStart,
    r.weekEnd,
    r.calendarWeek,
    r.region,
    r.maize,
    r.rice,
    r.beans,
    r.sorghum,
    r.bulrushMillet,
    r.fingerMillet,
    r.roundPotato,
  ];
}

function buildSheet(ws: ExcelJS.Worksheet, records: PriceRecord[]) {
  ws.addRow(HEADERS);
  records.forEach((r) => ws.addRow(toRow(r)));

  const border: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFCCCCCC" } },
    bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
    left: { style: "thin", color: { argb: "FFCCCCCC" } },
    right: { style: "thin", color: { argb: "FFCCCCCC" } },
  };

  const header = ws.getRow(1);
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F6B3A" } };
    cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = border;
  });

  for (let i = 2; i <= records.length + 1; i++) {
    const row = ws.getRow(i);
    const altBg = i % 2 === 0 ? "FFF2F7F2" : "FFFFFFFF";
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: altBg } };
      cell.font = { name: "Arial" };
      cell.border = border;
      if (colNumber >= FIRST_PRICE_COL && typeof cell.value === "number") {
        cell.numFmt = "#,##0";
      }
    });
  }

  ws.columns = HEADERS.map((h) => ({ width: Math.max(12, h.length + 2) }));
}

export async function exportToExcel(records: PriceRecord[]) {
  const wb = new ExcelJS.Workbook();

  const allSorted = records
    .slice()
    .sort(
      (a, b) =>
        isoDate(b.weekStart).localeCompare(isoDate(a.weekStart)) ||
        a.region.localeCompare(b.region),
    );

  const ws1 = wb.addWorksheet("DATA");
  buildSheet(ws1, allSorted);

  // NATIONAL TREND: always pulled from stored records, ascending by weekStart
  const national = records
    .filter((r) => r.region.toLowerCase().trim() === "national average")
    .slice()
    .sort((a, b) => isoDate(a.weekStart).localeCompare(isoDate(b.weekStart)));
  const ws2 = wb.addWorksheet("NATIONAL TREND");
  buildSheet(ws2, national);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const today = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Tanzania_Marktpreise_${today}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
