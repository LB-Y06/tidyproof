export type ColumnKind = "number" | "date" | "boolean" | "text" | "empty";

export type Severity = "high" | "medium" | "low";

export interface CsvTable {
  fileName: string;
  headers: string[];
  rows: string[][];
}

export interface QualityIssue {
  code: string;
  title: string;
  detail: string;
  severity: Severity;
  columnIndex?: number;
}

export interface NumericSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  outlierCount: number;
}

export interface ColumnProfile {
  index: number;
  name: string;
  kind: ColumnKind;
  missingCount: number;
  missingPct: number;
  uniqueCount: number;
  samples: string[];
  presenceSample: boolean[];
  mixedValueCount: number;
  issues: QualityIssue[];
  numeric?: NumericSummary;
}

export interface Analysis {
  rowCount: number;
  columnCount: number;
  cellCount: number;
  missingCells: number;
  missingPct: number;
  duplicateRows: number;
  completeness: number;
  uniqueness: number;
  consistency: number;
  score: number;
  columns: ColumnProfile[];
  issues: QualityIssue[];
}

export interface CleanOptions {
  trimWhitespace: boolean;
  removeDuplicates: boolean;
  dropEmptyColumns: boolean;
  removeIncompleteRows: boolean;
}
