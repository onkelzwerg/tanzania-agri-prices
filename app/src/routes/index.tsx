import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/Navbar";
import { PriceTable } from "@/components/PriceTable";
import { loadRecords } from "@/lib/storage";
import { exportToExcel } from "@/lib/excel-export";
import type { PriceRecord } from "@/lib/types";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tanzania Market Price Tracker — Data Table" },
      {
        name: "description",
        content: "Track weekly agricultural commodity prices across Tanzania regions.",
      },
    ],
  }),
  component: IndexPage,
});

function IndexPage() {
  const [records, setRecords] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setRecords(await loadRecords());
      } catch (e) {
        toast.error("Failed to load records: " + (e as Error).message);
      }
      setLoading(false);
    })();
  }, []);

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
      <main className="container mx-auto px-4 py-6 space-y-10">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading records…
          </div>
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-primary">All Records</h2>
              <PriceTable records={records} />
            </section>
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-primary">National Trend</h2>
              <p className="text-sm text-muted-foreground">
                National Average rows extracted from each weekly report.
              </p>
              <PriceTable
                records={records.filter((r) => r.region.toLowerCase() === "national average")}
              />
            </section>
          </>
        )}
      </main>
      <Toaster />
    </div>
  );
}
