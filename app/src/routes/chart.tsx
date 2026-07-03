import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Navbar } from "@/components/Navbar";
import { loadRecords } from "@/lib/storage";
import { exportToExcel } from "@/lib/excel-export";
import type { PriceRecord, CropKey } from "@/lib/types";
import { CROP_KEYS, CROP_LABELS, CROP_COLORS } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

/** Slot colors for the region comparison lines. Black is reserved for the national line. */
const REGION_COLORS = ["#C0392B", "#2980B9", "#F0A500"] as const;
const NATIONAL_COLOR = "#111827";
const NATIONAL_KEY = "__national__";
/** Sentinel value for an empty region slot (radix Select disallows empty-string values). */
const NONE_VALUE = "__none__";

export const Route = createFileRoute("/chart")({
  head: () => ({
    meta: [
      { title: "Tanzania Market Price Tracker — National Trend" },
      {
        name: "description",
        content: "National average weekly price trends for key Tanzanian crops.",
      },
    ],
  }),
  component: ChartPage,
});

import { isoDate } from "@/lib/types";

function ChartPage() {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<CropKey>("beans");
  const [selectedRegions, setSelectedRegions] = useState<(string | null)[]>([null, null, null]);
  const [showNational, setShowNational] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setRecords(await loadRecords());
      } catch (e) {
        toast.error("Failed to load records: " + (e as Error).message);
      }
    })();
  }, []);

  const data = useMemo(() => {
    return records
      .filter((r) => r.region.toLowerCase() === "national average")
      .slice()
      .sort((a, b) => isoDate(a.weekStart).localeCompare(isoDate(b.weekStart)))
      .map((r) => ({
        weekStart: r.weekStart,
        maize: r.maize,
        rice: r.rice,
        beans: r.beans,
        sorghum: r.sorghum,
        bulrushMillet: r.bulrushMillet,
        fingerMillet: r.fingerMillet,
        roundPotato: r.roundPotato,
      }));
  }, [records]);

  // Distinct mainland region names (excluding the national average row), sorted.
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      if (r.region.toLowerCase() !== "national average") set.add(r.region);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [records]);

  // Default the first slot to the first available region once data has loaded.
  useEffect(() => {
    if (regions.length > 0) {
      setSelectedRegions((prev) =>
        prev.every((x) => x === null) ? [regions[0], null, null] : prev,
      );
    }
  }, [regions]);

  // One data point per week across the whole dataset, with a column per selected region
  // plus the national-average value for the chosen crop.
  const regionalData = useMemo(() => {
    // weekStart -> (lowercased region -> record)
    const byWeek = new Map<string, Map<string, PriceRecord>>();
    for (const r of records) {
      let m = byWeek.get(r.weekStart);
      if (!m) {
        m = new Map();
        byWeek.set(r.weekStart, m);
      }
      m.set(r.region.toLowerCase(), r);
    }
    const weeks = [...byWeek.keys()].sort((a, b) => isoDate(a).localeCompare(isoDate(b)));
    return weeks.map((weekStart) => {
      const m = byWeek.get(weekStart)!;
      const row: Record<string, string | number | null> = { weekStart };
      for (const region of selectedRegions) {
        if (region) row[region] = m.get(region.toLowerCase())?.[selectedCrop] ?? null;
      }
      row[NATIONAL_KEY] = m.get("national average")?.[selectedCrop] ?? null;
      return row;
    });
  }, [records, selectedRegions, selectedCrop]);

  const activeRegions = selectedRegions
    .map((region, i) => ({ region, color: REGION_COLORS[i] }))
    .filter((x): x is { region: string; color: string } => x.region !== null);

  const handleExport = async () => {
    if (records.length === 0) {
      toast.error("No records to export.");
      return;
    }
    try {
      await exportToExcel(records);
      toast.success("Excel file downloaded.");
    } catch (e) {
      toast.error("Export failed: " + (e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onExport={handleExport} />
      <main className="container mx-auto px-4 py-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">National Average Trend</h2>
          <p className="text-sm text-muted-foreground">Weekly prices in TZS/kg</p>
        </div>

        {data.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground">
            No national average data yet. Import PDFs to populate the chart.
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-card">
            <div className="w-full h-[500px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#CCCCCC" />
                  <XAxis
                    dataKey="weekStart"
                    angle={-35}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "TZS / kg",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 12 },
                    }}
                  />
                  <Tooltip />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                  {CROP_KEYS.map((k) => (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      name={CROP_LABELS[k]}
                      stroke={CROP_COLORS[k]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {regions.length > 0 && (
          <>
            <div className="pt-4">
              <h2 className="text-xl font-bold text-foreground">Regional Price Trend</h2>
              <p className="text-sm text-muted-foreground">
                Compare up to three regions for one crop. Weekly prices in TZS/kg.
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-card space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: REGION_COLORS[i] }}
                    />
                    <Select
                      value={selectedRegions[i] ?? NONE_VALUE}
                      onValueChange={(v) =>
                        setSelectedRegions((prev) => {
                          const next = [...prev];
                          next[i] = v === NONE_VALUE ? null : v;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE_VALUE}>— None —</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Crop</span>
                  <Select value={selectedCrop} onValueChange={(v) => setSelectedCrop(v as CropKey)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CROP_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {CROP_LABELS[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 cursor-pointer"
                    checked={showNational}
                    onChange={(e) => setShowNational(e.target.checked)}
                  />
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: NATIONAL_COLOR }}
                    />
                    National Average
                  </span>
                </label>
              </div>

              {activeRegions.length === 0 && !showNational ? (
                <div className="p-12 text-center text-muted-foreground">
                  Select at least one region to see the trend.
                </div>
              ) : (
                <div className="w-full h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={regionalData}
                      margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#CCCCCC" />
                      <XAxis
                        dataKey="weekStart"
                        angle={-35}
                        textAnchor="end"
                        height={70}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        label={{
                          value: "TZS / kg",
                          angle: -90,
                          position: "insideLeft",
                          style: { fontSize: 12 },
                        }}
                      />
                      <Tooltip />
                      <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 20 }} />
                      {activeRegions.map(({ region, color }) => (
                        <Line
                          key={region}
                          type="monotone"
                          dataKey={region}
                          name={region}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                      {showNational && (
                        <Line
                          type="monotone"
                          dataKey={NATIONAL_KEY}
                          name="National Average"
                          stroke={NATIONAL_COLOR}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <Toaster />
    </div>
  );
}
