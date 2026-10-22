import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ChartColumn,
  Check,
  CheckCircle2,
  Columns3,
  Download,
  FileSpreadsheet,
  Github,
  Info,
  LockKeyhole,
  ListChecks,
  Plus,
  RefreshCw,
  Rows3,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  buildDataAnalysis,
  type ColumnAnalysis,
  type DataAnalysis,
} from "./lib/analysis";
import { parseCsv } from "./lib/csv";
import { demoTable, sampleCsv } from "./lib/demo";
import { FILE_ACCEPT, cleanOutputLabel, createCleanFile, parseDataFile } from "./lib/files";
import { analyzeTable, cleanTable, getScoreLabel } from "./lib/quality";
import { validateRules } from "./lib/rules";
import type {
  Analysis,
  CleanOptions,
  ColumnKind,
  ColumnProfile,
  DataFile,
  DataRule,
  DataTable,
  QualityIssue,
  RuleOperator,
  Severity,
} from "./lib/types";

const MAX_FILE_SIZE = 12 * 1024 * 1024;
const numberFormat = new Intl.NumberFormat("en-US");

const initialCleanOptions: CleanOptions = {
  trimWhitespace: true,
  removeDuplicates: true,
  dropEmptyColumns: true,
  removeIncompleteRows: false,
};

function percent(value: number): string {
  return `${Math.round(value)}%`;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1000) return numberFormat.format(Math.round(value));
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function downloadFile(name: string, content: string | ArrayBuffer, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function outputStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-");
}

function ScoreDial({ score }: { score: number }) {
  const style = { "--score-turn": `${score * 3.6}deg` } as CSSProperties;
  return (
    <div className="score-dial" style={style} aria-label={`Data quality score: ${score} out of 100`}>
      <div className="score-dial__inner">
        <strong>{score}</strong>
        <span>/ 100</span>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="TidyProof home">
      <span className="brand__mark" aria-hidden="true">
        <span>T</span>
        <span className="brand__dot" />
      </span>
      <span>TidyProof</span>
    </a>
  );
}

function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`app-header ${compact ? "app-header--compact" : ""}`}>
      <Brand />
      <div className="app-header__actions">
        <span className="privacy-note">
          <LockKeyhole size={14} />
          Local-only analysis
        </span>
        <a
          className="icon-link"
          href="https://github.com/LB-Y06/tidyproof"
          target="_blank"
          rel="noreferrer"
          aria-label="View TidyProof on GitHub"
        >
          <Github size={19} />
        </a>
      </div>
    </header>
  );
}

interface FilePickerProps {
  onFile: (file: File) => void;
  onDemo?: () => void;
  compact?: boolean;
  busy?: boolean;
}

function FilePicker({ onFile, onDemo, compact = false, busy = false }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`file-picker ${compact ? "file-picker--compact" : ""} ${
        isDragging ? "is-dragging" : ""
      }`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={FILE_ACCEPT}
        aria-label="Choose a data file"
        onChange={handleChange}
      />
      <div className="file-picker__icon" aria-hidden="true">
        <Upload size={compact ? 19 : 23} />
      </div>
      <div className="file-picker__copy">
        <strong>{compact ? "Replace this data file" : "Drop a data file here"}</strong>
        <span>{compact ? "Nothing leaves this tab." : "or choose a file up to 12 MB"}</span>
      </div>
      <button
        className="button button--dark"
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Reading…" : compact ? "Choose file" : "Choose data file"}
      </button>
      {onDemo && (
        <button className="text-button" type="button" onClick={onDemo} disabled={busy}>
          Or inspect the sample
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}

function SampleSheet() {
  return (
    <div className="sample-sheet" aria-label="Example CSV quality report">
      <div className="sample-sheet__bar">
        <span className="window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>orders_export_august.csv</span>
        <span className="sample-sheet__status">
          <span />
          12 rows scanned
        </span>
      </div>
      <div className="sample-sheet__grid">
        <div className="sample-head">order_id</div>
        <div className="sample-head">customer</div>
        <div className="sample-head">region</div>
        <div className="sample-head">quantity</div>
        <span>A-1042</span>
        <span>Maya Chen</span>
        <span>north</span>
        <span>3</span>
        <span>A-1043</span>
        <span>Noah Patel</span>
        <span>west</span>
        <span>2</span>
        <span className="sample-row--duplicate">A-1045</span>
        <span className="sample-row--duplicate">Liam Okafor</span>
        <span className="sample-row--duplicate">west</span>
        <span className="sample-cell--empty" />
        <span>A-1046</span>
        <span>Sofia Rossi</span>
        <span>east</span>
        <span>7</span>
      </div>
      <div className="sample-annotation sample-annotation--duplicate">
        <span>Duplicate row</span>
        <ArrowRight size={15} />
      </div>
      <div className="sample-annotation sample-annotation--empty">
        <span>Missing value</span>
        <ArrowDown size={15} />
      </div>
      <div className="sample-result">
        <span>
          <Check size={15} /> 8 columns profiled
        </span>
        <span>
          <AlertTriangle size={15} /> 4 issues found
        </span>
        <strong>Score 78</strong>
      </div>
    </div>
  );
}

function Landing({
  onFile,
  onDemo,
  error,
  busy,
}: {
  onFile: (file: File) => void;
  onDemo: () => void;
  error: string | null;
  busy: boolean;
}) {
  return (
    <div id="top" className="landing">
      <AppHeader />
      <main>
        <section className="hero">
          <div className="hero__copy">
            <p className="hero__intro">A data quality check that runs before analysis does.</p>
            <h1>
              Inspect
              <br />
              before you trust.
            </h1>
            <p className="hero__body">
              Find missing values, duplicates, type drift, and outliers while the cost of fixing them
              is still small.
            </p>
            <div className="hero__proof">
              <span>
                <ShieldCheck size={17} />
                Private by design
              </span>
              <span>
                <ScanLine size={17} />
                Instant profile
              </span>
              <span>
                <Download size={17} />
                Clean export
              </span>
            </div>
          </div>
          <div className="hero__visual">
            <div className="visual-orbit visual-orbit--one" aria-hidden="true" />
            <div className="visual-orbit visual-orbit--two" aria-hidden="true" />
            <SampleSheet />
          </div>
        </section>

        <section className="upload-section" aria-labelledby="upload-heading">
          <div className="section-number">01</div>
          <div className="upload-section__content">
            <h2 id="upload-heading">Start with a file you already have.</h2>
            <p>
              CSV, Excel, TSV, JSON, and delimited text are parsed in this browser. No upload
              involved.
            </p>
            <FilePicker onFile={onFile} onDemo={onDemo} busy={busy} />
            {error && (
              <div className="inline-error" role="alert">
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        <section className="checks-section" aria-label="What TidyProof checks">
          <div className="check-item">
            <span className="check-item__icon">
              <Columns3 size={21} />
            </span>
            <strong>Structure</strong>
            <p>Empty columns, constant fields, and duplicate names.</p>
          </div>
          <div className="check-item">
            <span className="check-item__icon check-item__icon--cobalt">
              <Sparkles size={21} />
            </span>
            <strong>Consistency</strong>
            <p>Numeric, date, boolean, and text values that do not belong.</p>
          </div>
          <div className="check-item">
            <span className="check-item__icon check-item__icon--gold">
              <Rows3 size={21} />
            </span>
            <strong>Completeness</strong>
            <p>Missing rows and values by column, with severity levels.</p>
          </div>
          <div className="check-item">
            <span className="check-item__icon check-item__icon--rust">
              <ScanLine size={21} />
            </span>
            <strong>Signal</strong>
            <p>IQR outliers surfaced for review, never removed automatically.</p>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <span>TidyProof</span>
        <span>Built for analysts who would rather know now.</span>
        <span>MIT licensed</span>
      </footer>
    </div>
  );
}

function SideRail({ analysis, rulesCount }: { analysis: Analysis; rulesCount: number }) {
  return (
    <aside className="side-rail" aria-label="Report navigation">
      <div className="side-rail__label">Report</div>
      <nav>
        <a href="#overview" className="side-rail__active">
          <span>01</span>
          Overview
        </a>
        <a href="#issues">
          <span>02</span>
          Issues
          <em>{analysis.issues.length}</em>
        </a>
        <a href="#columns">
          <span>03</span>
          Columns
          <em>{analysis.columnCount}</em>
        </a>
        <a href="#analysis">
          <span>04</span>
          Analysis
        </a>
        <a href="#rules">
          <span>05</span>
          Rules
          {rulesCount > 0 && <em>{rulesCount}</em>}
        </a>
        <a href="#clean">
          <span>06</span>
          Clean & export
        </a>
      </nav>
      <div className="side-rail__privacy">
        <LockKeyhole size={16} />
        <strong>Local processing</strong>
        <p>Your data stays in this browser tab.</p>
      </div>
    </aside>
  );
}

function SummaryLedger({ analysis }: { analysis: Analysis }) {
  const rowsPerColumn =
    analysis.columnCount === 0 ? 0 : Math.round(analysis.cellCount / analysis.columnCount);
  return (
    <div className="summary-ledger">
      <div>
        <span>Rows</span>
        <strong>{numberFormat.format(analysis.rowCount)}</strong>
      </div>
      <div>
        <span>Columns</span>
        <strong>{numberFormat.format(analysis.columnCount)}</strong>
      </div>
      <div>
        <span>Cells checked</span>
        <strong>{numberFormat.format(analysis.cellCount)}</strong>
      </div>
      <div>
        <span>Missing</span>
        <strong>{percent(analysis.missingPct)}</strong>
      </div>
      <div>
        <span>Duplicates</span>
        <strong>{numberFormat.format(analysis.duplicateRows)}</strong>
      </div>
      <div>
        <span>Avg. rows / col.</span>
        <strong>{numberFormat.format(rowsPerColumn)}</strong>
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === "high") return <AlertTriangle size={17} />;
  if (severity === "medium") return <Info size={17} />;
  return <Check size={17} />;
}

function IssueRow({ issue }: { issue: QualityIssue }) {
  return (
    <article className={`issue-row issue-row--${issue.severity}`}>
      <span className="issue-row__icon">
        <SeverityIcon severity={issue.severity} />
      </span>
      <div className="issue-row__copy">
        <div>
          <strong>{issue.title}</strong>
          <span className="severity-label">{issue.severity}</span>
        </div>
        <p>{issue.detail}</p>
      </div>
      {typeof issue.columnIndex === "number" && (
        <a href={`#column-${issue.columnIndex}`}>View column</a>
      )}
    </article>
  );
}

const kindLabels: Record<ColumnKind, string> = {
  number: "Number",
  date: "Date",
  boolean: "Boolean",
  text: "Text",
  empty: "Empty",
};

function ColumnSpecimen({ column }: { column: ColumnProfile }) {
  const displaySamples = column.samples.length > 0 ? column.samples : ["No sample values"];
  return (
    <article className={`column-card column-card--${column.kind}`} id={`column-${column.index}`}>
      <div className="column-card__top">
        <div>
          <span className="column-card__index">{String(column.index + 1).padStart(2, "0")}</span>
          <h3>{column.name}</h3>
        </div>
        <span className="type-pill">{kindLabels[column.kind]}</span>
      </div>
      <div className="specimen-strip" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, cellIndex) => {
          const filled = column.presenceSample[cellIndex] ?? true;
          return <i className={filled ? "is-present" : "is-missing"} key={cellIndex} />;
        })}
      </div>
      <div className="column-card__metrics">
        <div>
          <span>Missing</span>
          <strong>{column.missingPct.toFixed(1)}%</strong>
        </div>
        <div>
          <span>Distinct</span>
          <strong>{numberFormat.format(column.uniqueCount)}</strong>
        </div>
        {column.numeric ? (
          <div>
            <span>Range</span>
            <strong>
              {formatNumber(column.numeric.min)}–{formatNumber(column.numeric.max)}
            </strong>
          </div>
        ) : (
          <div>
            <span>Values</span>
            <strong>{column.samples.length ? `${column.samples.length} shown` : "None"}</strong>
          </div>
        )}
      </div>
      <div className="column-card__samples">
        {displaySamples.map((value, index) => (
          <span key={`${value}-${index}`}>{value}</span>
        ))}
      </div>
      {column.issues.length > 0 && (
        <div className="column-card__flag">
          <AlertTriangle size={14} />
          {column.issues.length} flag{column.issues.length === 1 ? "" : "s"}
        </div>
      )}
    </article>
  );
}

function ShiftMetric({
  label,
  before,
  after,
  format = (value) => numberFormat.format(value),
  lowerIsBetter = true,
  neutral = false,
}: {
  label: string;
  before: number;
  after: number;
  format?: (value: number) => string;
  lowerIsBetter?: boolean;
  neutral?: boolean;
}) {
  const difference = after - before;
  const improved = lowerIsBetter ? difference < 0 : difference > 0;
  const worsened = lowerIsBetter ? difference > 0 : difference < 0;
  const state = neutral ? "unchanged" : improved ? "improved" : worsened ? "worsened" : "unchanged";

  return (
    <div className={`shift-metric shift-metric--${state}`}>
      <span>{label}</span>
      <div>
        <small>{format(before)}</small>
        <ArrowRight size={14} />
        <strong>{format(after)}</strong>
      </div>
    </div>
  );
}

function DistributionComparison({
  before,
  after,
}: {
  before: ColumnAnalysis;
  after?: ColumnAnalysis;
}) {
  if (before.histogram && before.histogram.length > 0) {
    const maximum = Math.max(
      1,
      ...before.histogram.map((bin) => bin.count),
      ...(after?.histogram ?? []).map((bin) => bin.count),
    );
    return (
      <div className="mirror-chart" aria-label={`${before.name} distribution before and after cleaning`}>
        <div className="mirror-chart__head" aria-hidden="true">
          <span>Before</span>
          <span>Value range</span>
          <span>After</span>
        </div>
        {before.histogram.map((bin, index) => {
          const afterBin = after?.histogram?.[index];
          return (
            <div className="mirror-chart__row" key={`${bin.from}-${bin.to}`}>
              <span className="mirror-chart__before">
                <b style={{ width: `${(bin.count / maximum) * 100}%` }} />
                <em>{bin.count}</em>
              </span>
              <span className="mirror-chart__label">{bin.label}</span>
              <span className="mirror-chart__after">
                <em>{afterBin?.count ?? 0}</em>
                <b style={{ width: `${((afterBin?.count ?? 0) / maximum) * 100}%` }} />
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  const labels = Array.from(
    new Set([
      ...(before.categories ?? []).map((item) => item.label),
      ...(after?.categories ?? []).map((item) => item.label),
    ]),
  ).slice(0, 6);
  const maximum = Math.max(
    1,
    ...(before.categories ?? []).map((item) => item.count),
    ...(after?.categories ?? []).map((item) => item.count),
  );

  if (labels.length === 0) {
    return <p className="distribution-empty">No populated values to visualize.</p>;
  }

  return (
    <div className="category-compare" aria-label={`${before.name} frequency comparison`}>
      <div className="category-compare__head">
        <span>Most frequent</span>
        <span>Before</span>
        <span>After</span>
      </div>
      {labels.map((label) => {
        const beforeCount = before.categories?.find((item) => item.label === label)?.count ?? 0;
        const afterCount = after?.categories?.find((item) => item.label === label)?.count ?? 0;
        return (
          <div className="category-compare__row" key={label}>
            <span title={label}>{label}</span>
            <span className="frequency-track frequency-track--before">
              <b style={{ width: `${(beforeCount / maximum) * 100}%` }} />
              <em>{beforeCount}</em>
            </span>
            <span className="frequency-track frequency-track--after">
              <b style={{ width: `${(afterCount / maximum) * 100}%` }} />
              <em>{afterCount}</em>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AnalysisSection({
  beforeTable,
  beforeProfile,
  afterTable,
  afterProfile,
}: {
  beforeTable: DataTable;
  beforeProfile: Analysis;
  afterTable: DataTable;
  afterProfile: Analysis;
}) {
  const before = useMemo(
    () => buildDataAnalysis(beforeTable, beforeProfile),
    [beforeTable, beforeProfile],
  );
  const after = useMemo(
    () => buildDataAnalysis(afterTable, afterProfile, before),
    [afterTable, afterProfile, before],
  );
  const afterColumns = new Map(after.columns.map((column) => [column.name, column]));
  const typeSummary = Object.entries(before.typeCounts)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => `${count} ${kindLabels[kind as ColumnKind].toLowerCase()}`)
    .join(", ");

  return (
    <section className="report-section analysis-section" id="analysis">
      <div className="section-heading">
        <div>
          <span className="section-heading__index">04</span>
          <h2>Before and after analysis</h2>
        </div>
        <p>
          Distributions use the cleaning rules selected below. Both sides share the same scale.
        </p>
      </div>

      <div className="shift-ledger">
        <ShiftMetric label="Rows" before={before.rowCount} after={after.rowCount} neutral />
        <ShiftMetric
          label="Missing cells"
          before={before.missingPct}
          after={after.missingPct}
          format={(value) => `${value.toFixed(1)}%`}
        />
        <ShiftMetric
          label="Duplicate rows"
          before={before.duplicateRows}
          after={after.duplicateRows}
        />
        <ShiftMetric
          label="IQR outliers"
          before={before.outlierCount}
          after={after.outlierCount}
        />
        <ShiftMetric
          label="Quality score"
          before={before.score}
          after={after.score}
          lowerIsBetter={false}
        />
      </div>

      <div className="analysis-intro">
        <div>
          <ChartColumn size={18} />
          <span>
            <strong>Column distributions</strong>
            {before.columnCount} columns · {typeSummary}
          </span>
        </div>
        <div className="analysis-legend" aria-label="Chart legend">
          <span>
            <i className="legend-before" />
            Before
          </span>
          <span>
            <i className="legend-after" />
            After
          </span>
        </div>
      </div>

      <div className="analysis-canvas">
        {before.columns.map((column) => {
          const afterColumn = afterColumns.get(column.name);
          return (
            <article className="distribution-row" key={column.name}>
              <div className="distribution-row__title">
                <div>
                  <h3>{column.name}</h3>
                  <span className="type-pill">{kindLabels[column.kind]}</span>
                </div>
                <span>
                  {column.uniqueCount} distinct · {column.missingPct.toFixed(1)}% missing
                </span>
              </div>
              <DistributionComparison before={column} after={afterColumn} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

const ruleOperatorLabels: Record<RuleOperator, string> = {
  required: "Must be filled",
  unique: "Must be unique",
  min: "Minimum value",
  max: "Maximum value",
  allowed: "Allowed values",
  pattern: "Matches regex",
};

function RulesSection({
  table,
  analysis,
  cleanedTable,
  rules,
  onRulesChange,
}: {
  table: DataTable;
  analysis: Analysis;
  cleanedTable: DataTable;
  rules: DataRule[];
  onRulesChange: (rules: DataRule[]) => void;
}) {
  const [columnIndex, setColumnIndex] = useState(0);
  const [operator, setOperator] = useState<RuleOperator>("required");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const selectedColumn = table.headers[columnIndex] ?? table.headers[0];
  const kind = analysis.columns[columnIndex]?.kind ?? "text";
  const availableOperators: RuleOperator[] = [
    "required",
    "unique",
    ...(kind === "number" ? (["min", "max"] as RuleOperator[]) : []),
    "allowed",
    "pattern",
  ];
  const beforeResult = useMemo(() => validateRules(table, rules), [table, rules]);
  const afterResult = useMemo(
    () => validateRules(cleanedTable, rules),
    [cleanedTable, rules],
  );

  function addRule() {
    const nextOperator = availableOperators.includes(operator) ? operator : "required";
    if (!selectedColumn) return;

    if (["min", "max"].includes(nextOperator) && !Number.isFinite(Number(value))) {
      setError("Enter a numeric limit.");
      return;
    }
    if (nextOperator === "allowed" && !value.trim()) {
      setError("Enter at least one allowed value.");
      return;
    }
    if (nextOperator === "pattern") {
      try {
        new RegExp(value);
      } catch {
        setError("Enter a valid regular expression.");
        return;
      }
    }

    onRulesChange([
      ...rules,
      {
        id: `rule-${Date.now()}-${rules.length}`,
        columnName: selectedColumn,
        operator: nextOperator,
        value: value.trim(),
      },
    ]);
    setValue("");
    setError("");
  }

  const needsValue = !["required", "unique"].includes(operator);
  const selectedKind = kindLabels[kind].toLowerCase();

  return (
    <section className="report-section rules-section" id="rules">
      <div className="section-heading">
        <div>
          <span className="section-heading__index">05</span>
          <h2>Validation rules</h2>
        </div>
        <p>Add business rules beyond structural checks. Violations point to exact rows.</p>
      </div>

      <div className="rules-layout">
        <div className="rule-builder">
          <div className="rule-builder__title">
            <ListChecks size={18} />
            <div>
              <strong>Add a rule</strong>
              <span>{rules.length} active</span>
            </div>
          </div>
          <label>
            Column
            <select
              value={columnIndex}
              onChange={(event) => {
                setColumnIndex(Number(event.target.value));
                setOperator("required");
                setValue("");
                setError("");
              }}
            >
              {table.headers.map((header, index) => (
                <option value={index} key={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
          <div className="rule-builder__meta">Detected as {selectedKind}</div>
          <label>
            Rule
            <select
              value={availableOperators.includes(operator) ? operator : "required"}
              onChange={(event) => {
                setOperator(event.target.value as RuleOperator);
                setValue("");
                setError("");
              }}
            >
              {availableOperators.map((item) => (
                <option value={item} key={item}>
                  {ruleOperatorLabels[item]}
                </option>
              ))}
            </select>
          </label>
          {needsValue && (
            <label>
              Condition
              <input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={
                  operator === "allowed"
                    ? "paid, pending, refunded"
                    : operator === "pattern"
                      ? "^[^@]+@[^@]+\\.[^@]+$"
                      : "0"
                }
              />
            </label>
          )}
          {error && (
            <div className="rule-builder__error" role="alert">
              {error}
            </div>
          )}
          <button className="button button--dark" type="button" onClick={addRule}>
            <Plus size={16} />
            Add rule
          </button>
        </div>

        <div className="rule-results">
          <div className="rule-summary">
            <div>
              <span>Before cleaning</span>
              <strong>{beforeResult.violations.length}</strong>
              <small>violations</small>
            </div>
            <ArrowRight size={22} />
            <div>
              <span>After cleaning</span>
              <strong>{afterResult.violations.length}</strong>
              <small>violations</small>
            </div>
          </div>
          {afterResult.missingColumns.length > 0 && (
            <p className="rule-note">
              Removed columns were skipped after cleaning: {afterResult.missingColumns.join(", ")}.
            </p>
          )}
          {rules.length === 0 ? (
            <div className="rule-empty">
              <ListChecks size={24} />
              <div>
                <strong>No business rules yet</strong>
                <p>Start with a unique identifier, required field, numeric range, or allowed list.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="rule-list">
                {rules.map((rule, index) => (
                  <div className="rule-row" key={rule.id}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{rule.columnName}</strong>
                      <p>
                        {ruleOperatorLabels[rule.operator]}
                        {rule.value ? `: ${rule.value}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove rule for ${rule.columnName}`}
                      onClick={() => onRulesChange(rules.filter((item) => item.id !== rule.id))}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {beforeResult.violations.length > 0 && (
                <div className="violation-list">
                  {beforeResult.violations.slice(0, 8).map((violation, index) => (
                    <div
                      className="violation-row"
                      key={`${violation.ruleId}-${violation.rowIndex}-${index}`}
                    >
                      <span>Row {violation.rowIndex + 2}</span>
                      <strong>{violation.columnName}</strong>
                      <p>{violation.message}</p>
                      <code>{violation.value || "(blank)"}</code>
                    </div>
                  ))}
                  {beforeResult.violations.length > 8 && (
                    <p className="violation-more">
                      +{beforeResult.violations.length - 8} more violations in the quality report.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-row__icon">{icon}</span>
      <span className="toggle-row__copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-control" aria-hidden="true">
        <span />
      </span>
    </label>
  );
}

function CleanPanel({
  table,
  analysis,
  cleanedTable,
  cleanedAnalysis,
  options,
  onOptionsChange,
  onExportCsv,
  onExportReport,
  exportLabel,
}: {
  table: DataTable;
  analysis: Analysis;
  cleanedTable: DataTable;
  cleanedAnalysis: Analysis;
  options: CleanOptions;
  onOptionsChange: (options: CleanOptions) => void;
  onExportCsv: () => void;
  onExportReport: () => void;
  exportLabel: string;
}) {
  const changedRows = table.rows.length - cleanedTable.rows.length;
  const changedColumns = table.headers.length - cleanedTable.headers.length;

  function setOption<Key extends keyof CleanOptions>(key: Key, value: CleanOptions[Key]) {
    onOptionsChange({ ...options, [key]: value });
  }

  return (
    <section className="report-section clean-section" id="clean">
      <div className="section-heading">
        <div>
          <span className="section-heading__index">06</span>
          <h2>Clean, then export</h2>
        </div>
        <p>Rules are applied in order. Review the before and after before downloading.</p>
      </div>
      <div className="clean-layout">
        <div className="clean-rules">
          <Toggle
            checked={options.trimWhitespace}
            onChange={(value) => setOption("trimWhitespace", value)}
            title="Trim whitespace"
            description="Remove leading and trailing spaces from every cell."
            icon={<Sparkles size={18} />}
          />
          <Toggle
            checked={options.removeDuplicates}
            onChange={(value) => setOption("removeDuplicates", value)}
            title="Remove exact duplicates"
            description="Keep the first row when all cell values match."
            icon={<Trash2 size={18} />}
          />
          <Toggle
            checked={options.dropEmptyColumns}
            onChange={(value) => setOption("dropEmptyColumns", value)}
            title="Drop empty columns"
            description="Remove fields with no populated values."
            icon={<Columns3 size={18} />}
          />
          <Toggle
            checked={options.removeIncompleteRows}
            onChange={(value) => setOption("removeIncompleteRows", value)}
            title="Remove incomplete rows"
            description="Use with care: any blank cell removes the entire row."
            icon={<Rows3 size={18} />}
          />
        </div>
        <div className="clean-result">
          <div className="clean-result__header">
            <span>Result preview</span>
            <span className="live-indicator">
              <span />
              Live
            </span>
          </div>
          <div className="before-after">
            <div>
              <span>Before</span>
              <strong>{analysis.score}</strong>
              <small>{numberFormat.format(table.rows.length)} rows</small>
            </div>
            <ArrowRight size={25} />
            <div>
              <span>After</span>
              <strong>{cleanedAnalysis.score}</strong>
              <small>{numberFormat.format(cleanedTable.rows.length)} rows</small>
            </div>
          </div>
          <div className="change-summary">
            <span>{changedRows} rows removed</span>
            <span>{changedColumns} columns removed</span>
            <span>{cleanedAnalysis.issues.length} issues remain</span>
          </div>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>
                  {cleanedTable.headers.slice(0, 6).map((header) => (
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cleanedTable.rows.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {cleanedTable.headers.slice(0, 6).map((header, columnIndex) => (
                      <td key={`${header}-${columnIndex}`}>{row[columnIndex] || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="export-actions">
            <button className="button button--primary" type="button" onClick={onExportCsv}>
              <Download size={17} />
              {exportLabel}
            </button>
            <button className="button button--secondary" type="button" onClick={onExportReport}>
              <FileSpreadsheet size={17} />
              Quality report
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Report({
  dataFile,
  sheetIndex,
  onSheetChange,
  onReset,
  onReplace,
  busy,
}: {
  dataFile: DataFile;
  sheetIndex: number;
  onSheetChange: (index: number) => void;
  onReset: () => void;
  onReplace: (file: File) => void;
  busy: boolean;
}) {
  const table = dataFile.sheets[sheetIndex];
  const analysis = useMemo(() => analyzeTable(table), [table]);
  const [cleanOptions, setCleanOptions] = useState<CleanOptions>(initialCleanOptions);
  const [rules, setRules] = useState<DataRule[]>([]);
  const cleanedTable = useMemo(() => cleanTable(table, cleanOptions), [table, cleanOptions]);
  const cleanedAnalysis = useMemo(() => analyzeTable(cleanedTable), [cleanedTable]);
  const scoreLabel = getScoreLabel(analysis.score);
  const exportLabel = cleanOutputLabel(table);

  async function exportData() {
    const cleanFile = await createCleanFile(cleanedTable);
    downloadFile(cleanFile.name, cleanFile.data, cleanFile.mime);
  }

  function exportReport() {
    const sheetSuffix = table.sheetName
      ? `-${table.sheetName.replace(/[^\p{L}\p{N}_-]+/gu, "-")}`
      : "";
    const beforeAnalysis = buildDataAnalysis(table, analysis);
    const afterAnalysis = buildDataAnalysis(cleanedTable, cleanedAnalysis, beforeAnalysis);
    const report = {
      generatedAt: new Date().toISOString(),
      source: table.fileName,
      sheet: table.sheetName ?? null,
      format: table.sourceFormat,
      cleaningRules: cleanOptions,
      original: analysis,
      cleaned: cleanedAnalysis,
      customRules: rules,
      customRuleResults: {
        before: validateRules(table, rules),
        after: validateRules(cleanedTable, rules),
      },
      dataAnalysis: {
        before: beforeAnalysis,
        after: afterAnalysis,
      },
    };
    downloadFile(
      `${outputStem(table.fileName)}${sheetSuffix}-quality-report.json`,
      JSON.stringify(report, null, 2),
      "application/json",
    );
  }

  return (
    <div id="top" className="report-shell">
      <AppHeader compact />
      <div className="report-grid">
        <SideRail analysis={analysis} rulesCount={rules.length} />
        <main className="report-main">
          <div className="report-masthead">
            <div>
              <span className="report-masthead__label">
                <CheckCircle2 size={15} />
                Scan complete
              </span>
              <h1>{table.fileName}</h1>
              <p>
                {table.sourceFormat.toUpperCase()}
                {table.sheetName ? ` · ${table.sheetName}` : ""} · Reviewed at{" "}
                {new Intl.DateTimeFormat("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                }).format(new Date())}
              </p>
            </div>
            <div className="report-masthead__actions">
              {dataFile.sheets.length > 1 && (
                <label className="sheet-picker">
                  Sheet
                  <select
                    value={sheetIndex}
                    onChange={(event) => onSheetChange(Number(event.target.value))}
                  >
                    {dataFile.sheets.map((sheet, index) => (
                      <option value={index} key={`${sheet.sheetName}-${index}`}>
                        {sheet.sheetName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button className="button button--quiet" type="button" onClick={onReset}>
                <RefreshCw size={16} />
                New file
              </button>
            </div>
          </div>

          <section className="report-section overview-section" id="overview">
            <div className="section-heading">
              <div>
                <span className="section-heading__index">01</span>
                <h2>Quality overview</h2>
              </div>
              <p>The score weighs completeness at 60%, uniqueness at 25%, and consistency at 15%.</p>
            </div>
            <div className="overview-layout">
              <div className="score-block">
                <ScoreDial score={analysis.score} />
                <div className="score-block__copy">
                  <span>Assessment</span>
                  <strong>{scoreLabel}</strong>
                  <p>
                    {analysis.issues.length === 0
                      ? "No structural problems were detected."
                      : `${analysis.issues.length} item${
                          analysis.issues.length === 1 ? "" : "s"
                        } should be reviewed before analysis.`}
                  </p>
                </div>
              </div>
              <div className="score-bars">
                <div>
                  <span>
                    Completeness <strong>{percent(analysis.completeness * 100)}</strong>
                  </span>
                  <i>
                    <b style={{ width: percent(analysis.completeness * 100) }} />
                  </i>
                </div>
                <div>
                  <span>
                    Uniqueness <strong>{percent(analysis.uniqueness * 100)}</strong>
                  </span>
                  <i>
                    <b style={{ width: percent(analysis.uniqueness * 100) }} />
                  </i>
                </div>
                <div>
                  <span>
                    Consistency <strong>{percent(analysis.consistency * 100)}</strong>
                  </span>
                  <i>
                    <b style={{ width: percent(analysis.consistency * 100) }} />
                  </i>
                </div>
              </div>
            </div>
            <SummaryLedger analysis={analysis} />
          </section>

          <section className="report-section issues-section" id="issues">
            <div className="section-heading">
              <div>
                <span className="section-heading__index">02</span>
                <h2>What needs attention</h2>
              </div>
              <p>Severity is a review priority, not an automatic reason to delete data.</p>
            </div>
            {analysis.issues.length > 0 ? (
              <div className="issue-list">
                {analysis.issues.map((issue) => (
                  <IssueRow key={issue.code} issue={issue} />
                ))}
              </div>
            ) : (
              <div className="all-clear">
                <CheckCircle2 size={25} />
                <div>
                  <strong>No structural issues found</strong>
                  <p>Your columns and rows pass the current quality checks.</p>
                </div>
              </div>
            )}
          </section>

          <section className="report-section columns-section" id="columns">
            <div className="section-heading">
              <div>
                <span className="section-heading__index">03</span>
                <h2>Column specimens</h2>
              </div>
              <p>Each strip samples the column from left to right; gaps show missing values.</p>
            </div>
            <div className="column-grid">
              {analysis.columns.map((column) => (
                <ColumnSpecimen column={column} key={`${column.index}-${column.name}`} />
              ))}
            </div>
          </section>

          <AnalysisSection
            beforeTable={table}
            beforeProfile={analysis}
            afterTable={cleanedTable}
            afterProfile={cleanedAnalysis}
          />

          <RulesSection
            table={table}
            analysis={analysis}
            cleanedTable={cleanedTable}
            rules={rules}
            onRulesChange={setRules}
          />

          <CleanPanel
            table={table}
            analysis={analysis}
            cleanedTable={cleanedTable}
            cleanedAnalysis={cleanedAnalysis}
            options={cleanOptions}
            onOptionsChange={setCleanOptions}
            onExportCsv={exportData}
            onExportReport={exportReport}
            exportLabel={exportLabel}
          />

          <div className="replace-row">
            <FilePicker onFile={onReplace} compact busy={busy} />
            <button className="text-button" type="button" onClick={onReset}>
              <X size={16} />
              Start over
            </button>
          </div>
        </main>
      </div>
      <footer className="site-footer">
        <span>TidyProof</span>
        <span>Parsed locally. Nothing uploaded.</span>
        <a href="https://github.com/LB-Y06/tidyproof">Source on GitHub</a>
      </footer>
    </div>
  );
}

export default function App() {
  const [dataFile, setDataFile] = useState<DataFile | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setError(null);

    if (file.size > MAX_FILE_SIZE) {
      setError("This file is larger than 12 MB. Try a smaller export for the fastest scan.");
      return;
    }

    setBusy(true);
    try {
      const parsed = await parseDataFile(file);
      if (parsed.sheets.every((sheet) => sheet.rows.length === 0)) {
        throw new Error("This file has headers but no data rows.");
      }
      setDataFile(parsed);
      setSheetIndex(0);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The data file could not be read.");
    } finally {
      setBusy(false);
    }
  }

  if (dataFile) {
    return (
      <Report
        key={`${dataFile.fileName}-${sheetIndex}`}
        dataFile={dataFile}
        sheetIndex={sheetIndex}
        onSheetChange={setSheetIndex}
        busy={busy}
        onReplace={handleFile}
        onReset={() => {
          setDataFile(null);
          setSheetIndex(0);
          setError(null);
        }}
      />
    );
  }

  return (
    <Landing
      onFile={handleFile}
      onDemo={() => {
        setDataFile({
          fileName: demoTable.fileName,
          sheets: [parseCsv(sampleCsv, demoTable.fileName)],
        });
        setSheetIndex(0);
        setError(null);
      }}
      error={error}
      busy={busy}
    />
  );
}
