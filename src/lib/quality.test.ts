import { describe, expect, it } from "vitest";
import { demoTable } from "./demo";
import { analyzeTable, cleanTable, getScoreLabel } from "./quality";
import type { CsvTable } from "./types";

describe("analyzeTable", () => {
  it("profiles missing values, duplicates, and type drift", () => {
    const analysis = analyzeTable(demoTable);

    expect(analysis.rowCount).toBe(12);
    expect(analysis.columnCount).toBe(8);
    expect(analysis.duplicateRows).toBe(1);
    expect(analysis.missingCells).toBeGreaterThan(0);
    expect(analysis.columns.find((column) => column.name === "order_value")?.kind).toBe("number");
    expect(analysis.columns.find((column) => column.name === "quantity")?.kind).toBe("number");
    const segment = analysis.columns.find((column) => column.name === "segment");
    expect(segment?.kind).toBe("text");
    expect(segment?.presenceSample.slice(0, 2)).toEqual([false, true]);
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThan(100);
  });

  it("detects an empty column", () => {
    const table: CsvTable = {
      fileName: "small.csv",
      headers: ["name", "notes"],
      rows: [
        ["Ada", ""],
        ["Grace", ""],
      ],
    };

    const analysis = analyzeTable(table);
    expect(analysis.columns[1].kind).toBe("empty");
    expect(analysis.issues.some((issue) => issue.code.startsWith("empty_"))).toBe(true);
  });

  it("detects numeric outliers using the IQR rule", () => {
    const table: CsvTable = {
      fileName: "values.csv",
      headers: ["value"],
      rows: [["1"], ["2"], ["2"], ["3"], ["3"], ["4"], ["100"]],
    };

    const analysis = analyzeTable(table);
    expect(analysis.columns[0].numeric?.outlierCount).toBe(1);
  });
});

describe("cleanTable", () => {
  it("trims whitespace, removes duplicates, and drops empty columns", () => {
    const table: CsvTable = {
      fileName: "dirty.csv",
      headers: ["name", "empty"],
      rows: [
        [" Ada ", ""],
        ["Ada", ""],
        ["Grace", ""],
      ],
    };

    const cleaned = cleanTable(table, {
      trimWhitespace: true,
      removeDuplicates: true,
      dropEmptyColumns: true,
      removeIncompleteRows: false,
    });

    expect(cleaned.headers).toEqual(["name"]);
    expect(cleaned.rows).toEqual([["Ada"], ["Grace"]]);
  });
});

describe("getScoreLabel", () => {
  it("maps each score band to a readable label", () => {
    expect(getScoreLabel(95)).toBe("Ready to analyze");
    expect(getScoreLabel(88)).toBe("Mostly sound");
    expect(getScoreLabel(70)).toBe("Needs a review");
    expect(getScoreLabel(20)).toBe("High risk");
  });
});
