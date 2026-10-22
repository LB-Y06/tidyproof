import { describe, expect, it } from "vitest";
import { buildDataAnalysis } from "./analysis";
import { cleanTable, analyzeTable } from "./quality";
import type { DataTable } from "./types";

const table: DataTable = {
  fileName: "sales.csv",
  headers: ["region", "amount"],
  rows: [
    ["north", "10"],
    ["north", "20"],
    ["south", "30"],
    ["south", "30"],
  ],
  sourceFormat: "csv",
};

describe("buildDataAnalysis", () => {
  it("builds aligned numeric histograms and category frequencies", () => {
    const beforeProfile = analyzeTable(table);
    const before = buildDataAnalysis(table, beforeProfile);
    const cleaned = cleanTable(table, {
      trimWhitespace: true,
      removeDuplicates: true,
      dropEmptyColumns: true,
      removeIncompleteRows: false,
    });
    const after = buildDataAnalysis(cleaned, analyzeTable(cleaned), before);

    expect(before.columns[0].categories?.[0]).toEqual({ label: "north", count: 2 });
    expect(before.columns[1].histogram?.reduce((sum, bin) => sum + bin.count, 0)).toBe(4);
    expect(after.columns[1].histogram?.map((bin) => bin.from)).toEqual(
      before.columns[1].histogram?.map((bin) => bin.from),
    );
    expect(after.rowCount).toBe(3);
    expect(after.duplicateRows).toBe(0);
  });
});
