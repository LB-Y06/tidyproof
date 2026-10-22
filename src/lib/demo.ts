import type { DataTable } from "./types";

const sampleRows = [
  ["A-1042", "Maya Chen", "north", "2026-08-14", "$128.40", "3", "maia@example.com", ""],
  ["A-1043", "Noah Patel", "west", "2026-08-14", "$89.00", "2", "noah@example.com", "vip"],
  ["A-1044", "Ava Martinez", "North", "2026-08-15", "$242.15", "5", "ava@example.com", ""],
  ["A-1045", "Liam Okafor", "west", "2026-08-15", "$74.20", "", "liam@example.com", ""],
  ["A-1045", "Liam Okafor", "west", "2026-08-15", "$74.20", "", "liam@example.com", ""],
  ["A-1046", "Sofia Rossi", "east", "08/16/2026", "$310.00", "7", "sofia@example.com", "vip"],
  ["A-1047", "Ethan Park", "north", "2026-08-16", "$56.80", "1", "ethan@example.com", ""],
  ["A-1048", "", "south", "2026-08-17", "$1,420.00", "18", "unknown", ""],
  ["A-1049", "Amara Singh", "east", "2026-08-17", "$96.30", "2", "amara@example.com", ""],
  ["A-1050", "Leo Dubois", "south", "2026-08-18", "$109.99", "3", "leo@example.com", "vip"],
  ["A-1051", "Mia Johnson", "North", "2026-08-18", "$184.50", "4", "mia@example.com", ""],
  ["A-1052", "Kai Williams", "west", "not provided", "$0.00", "0", "kai@example.com", ""],
];

export const demoTable: DataTable = {
  fileName: "orders_export_august.csv",
  sourceFormat: "csv",
  headers: ["order_id", "customer", "region", "ordered_at", "order_value", "quantity", "email", "segment"],
  rows: sampleRows,
};

export const sampleCsv = [
  demoTable.headers.join(","),
  ...sampleRows.map((row) =>
    row
      .map((value) => (value.includes(",") ? `"${value}"` : value))
      .join(","),
  ),
].join("\n");
