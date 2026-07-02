export const KNOWN_REGIONS = [
  "Dar es Salaam",
  "Pemba North",
  "Pemba South",
  "Unguja North",
  "Unguja South",
  "Mjini Magharibi",
  "Arusha",
  "Dodoma",
  "Geita",
  "Iringa",
  "Kagera",
  "Katavi",
  "Kigoma",
  "Kilimanjaro",
  "Lindi",
  "Manyara",
  "Mara",
  "Mbeya",
  "Morogoro",
  "Mtwara",
  "Mwanza",
  "Njombe",
  "Pwani",
  "Rukwa",
  "Ruvuma",
  "Shinyanga",
  "Simiyu",
  "Singida",
  "Songwe",
  "Tabora",
  "Tanga",
] as const;

/** Match a known region at the start of a line. */
export function findRegion(line: string): string | null {
  const lower = line.toLowerCase().trim();
  for (const r of KNOWN_REGIONS) {
    const rl = r.toLowerCase();
    if (lower === rl || lower.startsWith(rl + " ")) {
      return r;
    }
  }
  return null;
}
