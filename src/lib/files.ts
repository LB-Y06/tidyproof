import Papa from "papaparse";
import { csvWithBom, decodeCsvBytes, parseCsv, tableFromMatrix } from "./csv";
import type { DataFile, DataFormat, DataTable } from "./types";

const DELIMITED_FORMATS = new Set<DataFormat>(["csv", "tsv", "txt"]);
const EXCEL_FORMATS = new Set<DataFormat>(["xlsx", "xlsm", "xls", "xlsb", "ods"]);

export const FILE_ACCEPT =
  ".csv,.tsv,.txt,.json,.xlsx,.xlsm,.xls,.xlsb,.ods,text/csv,text/tab-separated-values,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.oasis.opendocument.spreadsheet";

export function formatFromName(fileName: string): DataFormat {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || ![...DELIMITED_FORMATS, ...EXCEL_FORMATS, "json"].includes(extension as DataFormat)) {
    throw new Error("Choose a CSV, TSV, TXT, JSON, XLSX, XLS, XLSM, XLSB, or ODS file.");
  }
  return extension as DataFormat;
}

function jsonMatrix(value: unknown): unknown[][] {
  const array = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value).find(Array.isArray)
      : undefined;

  if (!Array.isArray(array) || array.length === 0) {
    throw new Error("JSON must contain a non-empty array of objects or rows.");
  }
  if (array.every(Array.isArray)) return array as unknown[][];
  if (array.every((row) => row !== null && typeof row === "object" && !Array.isArray(row))) {
    const headers = Array.from(
      new Set(array.flatMap((row) => Object.keys(row as Record<string, unknown>))),
    );
    return [
      headers,
      ...array.map((row) =>
        headers.map((header) => (row as Record<string, unknown>)[header]),
      ),
    ];
  }
  return [["value"], ...array.map((value) => [value])];
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function parseJsonText(text: string, fileName = "uploaded.json"): DataTable {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  const matrix = jsonMatrix(value).map((row) => row.map(cellText));
  return tableFromMatrix(matrix, fileName, "json");
}

export async function parseExcelBytes(
  bytes: ArrayBuffer,
  fileName = "workbook.xlsx",
): Promise<DataTable[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true });
  const tables = workbook.SheetNames.map((sheetName) => {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: "",
      dateNF: "yyyy-mm-dd",
      blankrows: false,
    });
    return tableFromMatrix(matrix, fileName, formatFromName(fileName), sheetName);
  }).filter((table) => table.headers.length > 0);

  if (tables.length === 0) throw new Error("This workbook does not contain a readable sheet.");
  return tables;
}

export async function parseDataFile(file: File): Promise<DataFile> {
  const format = formatFromName(file.name);

  if (EXCEL_FORMATS.has(format)) {
    return {
      fileName: file.name,
      sheets: await parseExcelBytes(await file.arrayBuffer(), file.name),
    };
  }

  const text = decodeCsvBytes(await file.arrayBuffer());
  if (format === "json") {
    return { fileName: file.name, sheets: [parseJsonText(text, file.name)] };
  }

  const table = parseCsv(text, file.name, {
    delimiter: format === "tsv" ? "\t" : undefined,
    sourceFormat: format,
  });
  return { fileName: file.name, sheets: [table] };
}

function outputStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-");
}

function sheetTitle(name?: string): string {
  return (name || "Cleaned data").replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
}

export function cleanOutputLabel(table: DataTable): string {
  if (EXCEL_FORMATS.has(table.sourceFormat)) return "Download clean Excel";
  if (table.sourceFormat === "json") return "Download clean JSON";
  if (table.sourceFormat === "tsv") return "Download clean TSV";
  return "Download clean CSV";
}

export async function createCleanFile(table: DataTable): Promise<{
  name: string;
  mime: string;
  data: string | ArrayBuffer;
  label: string;
}> {
  const stem = outputStem(table.fileName);
  const sheetSuffix = table.sheetName
    ? `-${table.sheetName.replace(/[^\p{L}\p{N}_-]+/gu, "-")}`
    : "";

  if (EXCEL_FORMATS.has(table.sourceFormat)) {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([table.headers, ...table.rows]),
      sheetTitle(table.sheetName),
    );
    return {
      name: `${stem}${sheetSuffix}-cleaned.xlsx`,
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: XLSX.write(workbook, { bookType: "xlsx", type: "array" }),
      label: "Download clean Excel",
    };
  }

  if (table.sourceFormat === "json") {
    const records = table.rows.map((row) =>
      Object.fromEntries(table.headers.map((header, index) => [header, row[index] ?? ""])),
    );
    return {
      name: `${stem}-cleaned.json`,
      mime: "application/json;charset=utf-8",
      data: JSON.stringify(records, null, 2),
      label: "Download clean JSON",
    };
  }

  if (table.sourceFormat === "tsv") {
    return {
      name: `${stem}-cleaned.tsv`,
      mime: "text/tab-separated-values;charset=utf-8",
      data: csvWithBom(Papa.unparse({ fields: table.headers, data: table.rows }, { delimiter: "\t" })),
      label: "Download clean TSV",
    };
  }

  return {
    name: `${stem}-cleaned.csv`,
    mime: "text/csv;charset=utf-8",
    data: csvWithBom(Papa.unparse({ fields: table.headers, data: table.rows })),
    label: "Download clean CSV",
  };
}
