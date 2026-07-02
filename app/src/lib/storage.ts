import { recordsFromCsv, type PriceRecord } from "tanzania-agri-prices-parser";

/**
 * Where the published dataset is served from. Defaults to the data repo via
 * jsDelivr; override with VITE_DATA_URL (e.g. a local file during development).
 */
const DATA_URL =
  import.meta.env.VITE_DATA_URL ||
  "https://cdn.jsdelivr.net/gh/onkelzwerg/tanzania-agri-prices-data@main/data/processed/prices.csv";

/** Load the full dataset (read-only) from the published CSV. */
export async function loadRecords(): Promise<PriceRecord[]> {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Could not load dataset (${res.status} ${res.statusText})`);
  }
  return recordsFromCsv(await res.text());
}
