export {
  CROP_KEYS,
  CROP_LABELS,
  calendarWeekFrom,
  isoDate,
  type CropKey,
  type PriceRecord,
} from "tanzania-agri-prices-parser";
import type { CropKey } from "tanzania-agri-prices-parser";

export const CROP_COLORS: Record<CropKey, string> = {
  maize: "#1F6B3A",
  rice: "#F0A500",
  beans: "#C0392B",
  sorghum: "#8E44AD",
  bulrushMillet: "#2980B9",
  fingerMillet: "#16A085",
  roundPotato: "#D35400",
};
