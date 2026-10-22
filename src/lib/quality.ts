import type {
  Analysis,
  CleanOptions,
  ColumnKind,
  ColumnProfile,
  CsvTable,
  NumericSummary,
  QualityIssue,
} from "./types";

const NUMBER_PATTERN = /^-?[$€£]?\s?\d{1,3}(,\d{3})*(\.\d+)?$|^-?[$€£]?\s?\d+(\.\d+)?$/;
const DATE_PATTERN = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;
const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no", "y", "n", "0", "1"]);

function isBlank(value: string): boolean {
  return value.trim() === "";
}

function toNumber(value: string): number {
  return Number(value.replace(/[$€£,\s]/g, ""));
}

function isUsableNumber(value: string): boolean {
  if (!NUMBER_PATTERN.test(value.trim())) return false;
  return Number.isFinite(toNumber(value));
}

function isDate(value: string): boolean {
  const trimmed = value.trim();
  return DATE_PATTERN.test(trimmed) && Number.isFinite(Date.parse(trimmed));
}

function isBoolean(value: string): boolean {
  return BOOLEAN_VALUES.has(value.trim().toLowerCase());
}

function matchesKind(value: string, kind: Exclude<ColumnKind, "empty">): boolean {
  if (kind === "number") return isUsableNumber(value);
  if (kind === "date") return isDate(value);
  if (kind === "boolean") return isBoolean(value);
  return !isBlank(value);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function quantile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function summarizeNumeric(values: number[]): NumericSummary {
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const q1 = quantile(values, 0.25);
  const q3 = quantile(values, 0.75);
  const spread = q3 - q1;
  const lowerFence = q1 - 1.5 * spread;
  const upperFence = q3 + 1.5 * spread;
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    median: median(values),
    q1,
    q3,
    outlierCount: values.filter((value) => value < lowerFence || value > upperFence).length,
  };
}

function inferKind(values: string[]): {
  kind: ColumnKind;
  mixedValueCount: number;
} {
  const present = values.filter((value) => !isBlank(value));
  if (present.length === 0) return { kind: "empty", mixedValueCount: 0 };

  const candidates: Exclude<ColumnKind, "empty">[] = ["number", "date", "boolean"];
  let bestKind: ColumnKind = "text";
  let bestMatches = 0;

  for (const candidate of candidates) {
    const matches = present.filter((value) => matchesKind(value, candidate)).length;
    if (matches > bestMatches && matches / present.length >= 0.9) {
      bestKind = candidate;
      bestMatches = matches;
    }
  }

  const mixedValueCount =
    bestKind === "text" ? 0 : present.length - bestMatches;
  return { kind: bestKind, mixedValueCount };
}

function rowKey(row: string[]): string {
  return row.map((cell) => cell.trim()).join("\u001f");
}

export function analyzeTable(table: CsvTable): Analysis {
  const rowCount = table.rows.length;
  const columnCount = table.headers.length;
  const cellCount = rowCount * columnCount;
  const issueList: QualityIssue[] = [];
  let missingCells = 0;
  let typedValueCount = 0;
  let typeMismatchCount = 0;

  const columns: ColumnProfile[] = table.headers.map((name, index) => {
    const values = table.rows.map((row) => row[index] ?? "");
    const present = values.filter((value) => !isBlank(value));
    const missingCount = rowCount - present.length;
    const missingPct = rowCount === 0 ? 0 : (missingCount / rowCount) * 100;
    const { kind, mixedValueCount } = inferKind(values);
    const uniqueCount = new Set(present.map((value) => value.trim().toLowerCase())).size;
    const columnIssues: QualityIssue[] = [];

    missingCells += missingCount;
    if (kind !== "text" && kind !== "empty") {
      typedValueCount += present.length;
      typeMismatchCount += mixedValueCount;
    }

    if (kind === "empty") {
      columnIssues.push({
        code: `empty_${index}`,
        title: "Empty column",
        detail: "Every value in this column is blank. It can be removed safely.",
        severity: "medium",
        columnIndex: index,
      });
    } else if (present.length === 1 && rowCount > 1) {
      columnIssues.push({
        code: `constant_${index}`,
        title: "Constant column",
        detail: "All populated rows contain the same single value.",
        severity: "low",
        columnIndex: index,
      });
    } else if (missingPct >= 20) {
      columnIssues.push({
        code: `missing_${index}`,
        title: "High missingness",
        detail: `${missingPct.toFixed(1)}% of values are blank. Check whether this field is optional or truncated.`,
        severity: missingPct >= 50 ? "high" : "medium",
        columnIndex: index,
      });
    }

    if (mixedValueCount > 0) {
      columnIssues.push({
        code: `mixed_${index}`,
        title: "Inconsistent values",
        detail: `${mixedValueCount} value${mixedValueCount === 1 ? "" : "s"} do not match the ${kind} type used by this column.`,
        severity: "medium",
        columnIndex: index,
      });
    }

    const numericValues =
      kind === "number"
        ? present.filter(isUsableNumber).map(toNumber)
        : [];
    const numeric = numericValues.length >= 4 ? summarizeNumeric(numericValues) : undefined;

    if (numeric && numeric.outlierCount > 0) {
      columnIssues.push({
        code: `outliers_${index}`,
        title: "Possible outliers",
        detail: `${numeric.outlierCount} value${numeric.outlierCount === 1 ? "" : "s"} fall outside the 1.5× IQR fence. Review before excluding.`,
        severity: "low",
        columnIndex: index,
      });
    }

    issueList.push(...columnIssues);
    return {
      index,
      name,
      kind,
      missingCount,
      missingPct,
      uniqueCount,
      samples: present.slice(0, 3),
      presenceSample: values.slice(0, 20).map((value) => !isBlank(value)),
      mixedValueCount,
      issues: columnIssues,
      numeric,
    };
  });

  const seenRows = new Set<string>();
  let duplicateRows = 0;
  for (const row of table.rows) {
    const key = rowKey(row);
    if (seenRows.has(key)) duplicateRows += 1;
    seenRows.add(key);
  }

  if (duplicateRows > 0) {
    issueList.unshift({
      code: "duplicate_rows",
      title: "Duplicate rows",
      detail: `${duplicateRows} row${duplicateRows === 1 ? " is" : "s are"} an exact repeat. Remove them before aggregating.`,
      severity: "high",
    });
  }

  if (typedValueCount > 0 && typeMismatchCount > 0) {
    issueList.push({
      code: "type_drift",
      title: "Type drift across columns",
      detail: `${typeMismatchCount} populated value${typeMismatchCount === 1 ? "" : "s"} break an otherwise consistent data type.`,
      severity: "medium",
    });
  }

  const completeness = cellCount === 0 ? 1 : (cellCount - missingCells) / cellCount;
  const uniqueness = rowCount === 0 ? 1 : (rowCount - duplicateRows) / rowCount;
  const consistency = typedValueCount === 0 ? 1 : (typedValueCount - typeMismatchCount) / typedValueCount;
  const score = Math.round(
    Math.max(0, Math.min(100, (completeness * 0.6 + uniqueness * 0.25 + consistency * 0.15) * 100)),
  );

  const severityRank = { high: 0, medium: 1, low: 2 };
  const issues = [...issueList].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );

  return {
    rowCount,
    columnCount,
    cellCount,
    missingCells,
    missingPct: cellCount === 0 ? 0 : (missingCells / cellCount) * 100,
    duplicateRows,
    completeness,
    uniqueness,
    consistency,
    score,
    columns,
    issues,
  };
}

export function cleanTable(table: CsvTable, options: CleanOptions): CsvTable {
  let headers = [...table.headers];
  let rows = table.rows.map((row) =>
    row.map((cell) => (options.trimWhitespace ? cell.trim() : cell)),
  );

  if (options.removeDuplicates) {
    const seen = new Set<string>();
    rows = rows.filter((row) => {
      const key = rowKey(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  if (options.dropEmptyColumns) {
    const keepIndexes = headers
      .map((_, index) => index)
      .filter((index) => rows.some((row) => !isBlank(row[index] ?? "")));
    headers = keepIndexes.map((index) => headers[index]);
    rows = rows.map((row) => keepIndexes.map((index) => row[index] ?? ""));
  }

  if (options.removeIncompleteRows) {
    rows = rows.filter((row) => row.every((cell) => !isBlank(cell)));
  }

  return { ...table, headers, rows };
}

export function getScoreLabel(score: number): string {
  if (score >= 95) return "Ready to analyze";
  if (score >= 85) return "Mostly sound";
  if (score >= 65) return "Needs a review";
  return "High risk";
}
