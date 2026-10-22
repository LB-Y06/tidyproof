import { describe, expect, it } from "vitest";
import { validateRules } from "./rules";
import type { DataTable, DataRule } from "./types";

const table: DataTable = {
  fileName: "customers.csv",
  headers: ["customer_id", "email", "age", "status"],
  rows: [
    ["C-1", "ada@example.com", "34", "paid"],
    ["C-1", "grace@example.com", "17", "pending"],
    ["C-3", "not-an-email", "", "refunded"],
  ],
  sourceFormat: "csv",
};

const rules: DataRule[] = [
  { id: "unique-id", columnName: "customer_id", operator: "unique", value: "" },
  { id: "email-pattern", columnName: "email", operator: "pattern", value: "^[^@]+@[^@]+\\.[^@]+$" },
  { id: "adult", columnName: "age", operator: "min", value: "18" },
  { id: "status", columnName: "status", operator: "allowed", value: "paid, pending" },
];

describe("validateRules", () => {
  it("reports row-level custom rule violations", () => {
    const result = validateRules(table, rules);

    expect(result.ruleCount).toBe(4);
    expect(result.violations).toHaveLength(4);
    expect(result.violations[0]).toMatchObject({
      columnName: "customer_id",
      rowIndex: 1,
      value: "C-1",
    });
    expect(result.violations[1]).toMatchObject({
      columnName: "email",
      rowIndex: 2,
    });
  });

  it("requires values independently of completeness checks", () => {
    const result = validateRules(table, [
      { id: "required-age", columnName: "age", operator: "required", value: "" },
    ]);

    expect(result.violations).toEqual([
      expect.objectContaining({ rowIndex: 2, value: "", message: "A value is required." }),
    ]);
  });
});
