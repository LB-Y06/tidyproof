import Papa from "papaparse";
import type { DataFormat, DataTable } from "./types";

export function decodeCsvBytes(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  const encoding =
    bytes[0] === 0xff && bytes[1] === 0xfe
      ? "utf-16le"
      : bytes[0] === 0xfe && bytes[1] === 0xff
        ? "utf-16be"
        : (() => {
            try {
              new TextDecoder("utf-8", { fatal: true }).decode(bytes);
              return "utf-8";
            } catch {
              return "gb18030";
            }
          })();

  return new TextDecoder(encoding).decode(bytes);
}

export function csvWithBom(text: string): string {
  return `\uFEFF${text}`;
}

export function tableFromMatrix(
  matrix: unknown[][],
  fileName: string,
  sourceFormat: DataFormat,
  sheetName?: string,
): DataTable {
  const rows = matrix.map((row) => row.map((cell) => String(cell ?? "")));
  while (rows.length > 0 && rows.at(-1)?.every((cell) => cell.trim() === "")) rows.pop();
  while (rows.length > 0 && rows[0].every((cell) => cell.trim() === "")) rows.shift();
  if (rows.length === 0) throw new Error("This file does not contain any rows.");

  const width = Math.max(...rows.map((row) => row.length));
  while (width > 0 && rows.every((row) => (row[width - 1] ?? "").trim() === "")) {
    rows.forEach((row) => row.splice(width - 1, 1));
  }

  const headers = rows[0].map((header, index) => header.trim() || `column_${index + 1}`);
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((header) => {
    const count = (seen.get(header) ?? 0) + 1;
    seen.set(header, count);
    return count === 1 ? header : `${header}_${count}`;
  });

  return {
    fileName,
    headers: uniqueHeaders,
    rows: rows.slice(1).map((row) => uniqueHeaders.map((_, index) => row[index] ?? "")),
    sourceFormat,
    sheetName,
  };
}

export function parseCsv(
  text: string,
  fileName = "uploaded.csv",
  options: { delimiter?: string; sourceFormat?: DataFormat; sheetName?: string } = {},
): DataTable {
  const normalized = text.replace(/^\uFEFF/, "");
  if (normalized.trim() === "") {
    throw new Error("This file does not contain any rows.");
  }

  const parsed = Papa.parse<string[]>(normalized, {
    skipEmptyLines: "greedy",
    delimiter: options.delimiter,
  });

  if (parsed.errors.length > 0 && parsed.data.length <= 1) {
    throw new Error(parsed.errors[0].message);
  }

  return tableFromMatrix(
    parsed.data.filter((row) => row.some((cell) => String(cell).trim())),
    fileName,
    options.sourceFormat ?? "csv",
    options.sheetName,
  );
}
