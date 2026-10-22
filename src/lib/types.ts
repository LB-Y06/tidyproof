export type ColumnKind = "number" | "date" | "boolean" | "text" | "empty";

export type Severity = "high" | "medium" | "low";

export type DataFormat = "csv" | "tsv" | "txt" | "json" | "xlsx" | "xlsm" | "xls" | "xlsb" | "ods";

export interface DataTable {
  fileName: string;
  headers: string[];
  rows: string[][];
  sourceFormat: DataFormat;
  sheetName?: string;
}

export interface DataFile {
  fileName: string;
  sheets: DataTable[];
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

export type RuleOperator = "required" | "unique" | "min" | "max" | "allowed" | "pattern";

export interface DataRule {
  id: string;
  columnName: string;
  operator: RuleOperator;
  value: string;
}

export interface RuleViolation {
  ruleId: string;
  columnName: string;
  rowIndex: number;
  value: string;
  message: string;
}

export interface RuleResult {
  ruleCount: number;
  checkedRows: number;
  violations: RuleViolation[];
  missingColumns: string[];
}
