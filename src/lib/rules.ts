import type { DataRule, DataTable, RuleResult, RuleViolation } from "./types";

function numberValue(value: string): number | null {
  const normalized = value.trim().replace(/[$€£,\s]/g, "");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

const messages = {
  required: "A value is required.",
  unique: "This value already appears earlier in the column.",
  min: "Value is below the allowed minimum.",
  max: "Value is above the allowed maximum.",
  allowed: "Value is not in the allowed list.",
  pattern: "Value does not match the required pattern.",
};

export function validateRules(table: DataTable, rules: DataRule[]): RuleResult {
  const violations: RuleViolation[] = [];
  const missingColumns = new Set<string>();

  for (const rule of rules) {
    const columnIndex = table.headers.indexOf(rule.columnName);
    if (columnIndex < 0) {
      missingColumns.add(rule.columnName);
      continue;
    }

    const seen = new Set<string>();
    const allowed = new Set(
      rule.value
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    let pattern: RegExp | null = null;
    if (rule.operator === "pattern") {
      try {
        pattern = new RegExp(rule.value);
      } catch {
        pattern = null;
      }
    }

    table.rows.forEach((row, rowIndex) => {
      const value = row[columnIndex] ?? "";
      const trimmed = value.trim();
      let failed = false;

      if (rule.operator === "required") {
        failed = trimmed === "";
      } else if (rule.operator === "unique") {
        if (trimmed !== "") {
          const key = trimmed.toLocaleLowerCase();
          failed = seen.has(key);
          seen.add(key);
        }
      } else if (rule.operator === "min" || rule.operator === "max") {
        const actual = numberValue(trimmed);
        const limit = numberValue(rule.value);
        failed =
          actual !== null &&
          limit !== null &&
          (rule.operator === "min" ? actual < limit : actual > limit);
      } else if (rule.operator === "allowed") {
        failed = trimmed !== "" && allowed.size > 0 && !allowed.has(trimmed);
      } else if (rule.operator === "pattern") {
        failed = trimmed !== "" && (!pattern || !pattern.test(trimmed));
      }

      if (failed) {
        violations.push({
          ruleId: rule.id,
          columnName: rule.columnName,
          rowIndex,
          value,
          message: messages[rule.operator],
        });
      }
    });
  }

  return {
    ruleCount: rules.length,
    checkedRows: table.rows.length,
    violations,
    missingColumns: [...missingColumns],
  };
}
