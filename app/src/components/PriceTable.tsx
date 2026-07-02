import { useMemo, useState } from "react";
import type { PriceRecord } from "@/lib/types";
import { CROP_KEYS, CROP_LABELS, isoDate } from "@/lib/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown } from "lucide-react";

interface Props {
  records: PriceRecord[];
}

type SortDir = "asc" | "desc";

export function PriceTable({ records }: Props) {
  const [region, setRegion] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const regions = useMemo(
    () => Array.from(new Set(records.map((r) => r.region))).sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return records
      .filter((r) => (region === "all" ? true : r.region === region))
      .filter((r) => (from ? isoDate(r.weekStart) >= from : true))
      .filter((r) => (to ? isoDate(r.weekEnd) <= to : true))
      .sort(
        (a, b) =>
          dir * isoDate(a.weekStart).localeCompare(isoDate(b.weekStart)) ||
          a.region.localeCompare(b.region),
      );
  }, [records, region, from, to, sortDir]);

  const toggleSort = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Region</label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Week Start ≥</label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Week End ≤</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" />
        </div>
        <div className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {records.length} records
        </div>
      </div>

      <div className="border rounded-lg overflow-auto max-h-[70vh]">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-primary text-primary-foreground">
              <SortableTh dir={sortDir} onClick={toggleSort}>
                Week Start
              </SortableTh>
              <Th>Week End</Th>
              <SortableTh dir={sortDir} onClick={toggleSort}>
                Cal. Week
              </SortableTh>
              <Th>Region</Th>
              {CROP_KEYS.map((k) => (
                <Th key={k} className="text-right">
                  {CROP_LABELS[k]}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="p-8 text-center text-muted-foreground">
                  No records match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((r, i) => (
              <tr
                key={r.id}
                style={{ backgroundColor: i % 2 === 1 ? "var(--row-alt)" : undefined }}
              >
                <Td>{r.weekStart}</Td>
                <Td>{r.weekEnd}</Td>
                <Td className="whitespace-nowrap text-muted-foreground">{r.calendarWeek}</Td>
                <Td className="font-medium">{r.region}</Td>
                {CROP_KEYS.map((k) => {
                  const v = r[k] as number | null;
                  return (
                    <Td key={k} className="text-right tabular-nums">
                      {v === null ? "–" : v.toLocaleString()}
                    </Td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border border-[#CCCCCC] ${className}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 border border-[#CCCCCC] ${className}`}>{children}</td>;
}
function SortableTh({
  children,
  dir,
  onClick,
}: {
  children: React.ReactNode;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide border border-[#CCCCCC]">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1 hover:opacity-80"
        title={`Sort ${dir === "asc" ? "descending" : "ascending"}`}
      >
        {children}
        <Icon className="h-3 w-3" />
      </button>
    </th>
  );
}
