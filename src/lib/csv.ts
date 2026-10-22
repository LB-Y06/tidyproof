import Papa from "papaparse";
import type { CsvTable } from "./types";

export function parseCsv(text: string, fileName = "uploaded.csv"): CsvTable {
  const normalized = text.replace(/^\uFEFF/, "");
  if (normalized.trim() === "") {
    throw new Error("This file does not contain any rows.");
  }

  const parsed = Papa.parse<string[]>(normalized, {
    skipEmptyLines: "greedy",
  });

  if (parsed.errors.length > 0 && parsed.data.length <= 1) {
    throw new Error(parsed.errors[0].message);
  }

  const nonEmptyRows = parsed.data.filter((row) => row.some((cell) => String(cell).trim()));
  if (nonEmptyRows.length === 0) {
    throw new Error("This file does not contain any rows.");
  }

  const headers = nonEmptyRows[0].map((header, index) => {
    const cleaned = String(header ?? "").trim();
    return cleaned || `column_${index + 1}`;
  });

  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map((header) => {
    const count = (seen.get(header) ?? 0) + 1;
    seen.set(header, count);
    return count === 1 ? header : `${header}_${count}`;
  });

  const rows = nonEmptyRows.slice(1).map((row) =>
    uniqueHeaders.map((_, index) => String(row[index] ?? "")),
  );

  return {
    fileName,
    headers: uniqueHeaders,
    rows,
  };
}
