import { analyzeTable } from "./quality";
import type { Analysis, ColumnKind, DataTable } from "./types";

export interface HistogramBin {
  label: string;
  from: number;
  to: number;
  count: number;
}

export interface FrequencyItem {
  label: string;
  count: number;
}

export interface ColumnAnalysis {
  index: number;
  name: string;
  kind: ColumnKind;
  missingPct: number;
  uniqueCount: number;
  numericRange?: { min: number; max: number; mean: number; median: number };
  histogram?: HistogramBin[];
  categories?: FrequencyItem[];
}

export interface DataAnalysis {
  rowCount: number;
  columnCount: number;
  cellCount: number;
  missingPct: number;
  duplicateRows: number;
  outlierCount: number;
  score: number;
  typeCounts: Record<ColumnKind, number>;
  columns: ColumnAnalysis[];
}

const HISTOGRAM_BINS = 8;

function numberValue(value: string): number | null {
  const normalized = value.trim().replace(/[$€£,\s]/g, "");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatTick(value: number): string {
  if (Math.abs(value) >= 1000) return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1).replace(/\.0$/, "");
}

function histogram(
  values: number[],
  baseline?: { min: number; max: number },
): HistogramBin[] {
  if (values.length === 0) return [];
  const min = baseline?.min ?? Math.min(...values);
  const max = baseline?.max ?? Math.max(...values);
  const span = max - min || 1;
  const width = span / HISTOGRAM_BINS;

  return Array.from({ length: HISTOGRAM_BINS }, (_, index) => {
    const from = min + width * index;
    const to = index === HISTOGRAM_BINS - 1 ? max : from + width;
    const count = values.filter((value) =>
      index === HISTOGRAM_BINS - 1
        ? value >= from && value <= max
        : value >= from && value < to,
    ).length;
    return {
      from,
      to,
      count,
      label: `${formatTick(from)}–${formatTick(to)}`,
    };
  });
}

function frequency(values: string[], limit = 6): FrequencyItem[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value.trim() || "Blank";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export function buildDataAnalysis(
  table: DataTable,
  profile: Analysis = analyzeTable(table),
  baseline?: DataAnalysis,
): DataAnalysis {
  const typeCounts: Record<ColumnKind, number> = {
    number: 0,
    date: 0,
    boolean: 0,
    text: 0,
    empty: 0,
  };

  const columns = profile.columns.map((column) => {
    typeCounts[column.kind] += 1;
    const values = table.rows.map((row) => row[column.index] ?? "").filter((value) => value.trim());
    const numericRange =
      column.kind === "number"
        ? baseline?.columns.find((item) => item.name === column.name)?.numericRange ??
          (column.numeric
            ? {
                min: column.numeric.min,
                max: column.numeric.max,
                mean: column.numeric.mean,
                median: column.numeric.median,
              }
            : undefined)
        : undefined;

    return {
      index: column.index,
      name: column.name,
      kind: column.kind,
      missingPct: column.missingPct,
      uniqueCount: column.uniqueCount,
      numericRange,
      histogram:
        column.kind === "number"
          ? histogram(
              values.map(numberValue).filter((value): value is number => value !== null),
              numericRange,
            )
          : undefined,
      categories:
        column.kind === "number" || column.kind === "empty" ? undefined : frequency(values),
    };
  });

  return {
    rowCount: profile.rowCount,
    columnCount: profile.columnCount,
    cellCount: profile.cellCount,
    missingPct: profile.missingPct,
    duplicateRows: profile.duplicateRows,
    outlierCount: profile.columns.reduce(
      (total, column) => total + (column.numeric?.outlierCount ?? 0),
      0,
    ),
    score: profile.score,
    typeCounts,
    columns,
  };
}
