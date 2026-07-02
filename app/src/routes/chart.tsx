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
import type { PriceRecord } from "@/lib/types";
import { CROP_KEYS, CROP_LABELS, CROP_COLORS } from "@/lib/types";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

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
      </main>
      <Toaster />
    </div>
  );
}
