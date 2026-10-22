import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

describe("parseCsv", () => {
  it("preserves quoted commas and removes completely empty rows", () => {
    const table = parseCsv(
      'name,note\n"Maya, Chen","Needs follow-up"\n\nNoah,"Okay"\n',
      "notes.csv",
    );

    expect(table.headers).toEqual(["name", "note"]);
    expect(table.rows).toEqual([
      ["Maya, Chen", "Needs follow-up"],
      ["Noah", "Okay"],
    ]);
  });

  it("renames duplicate and blank headers", () => {
    const table = parseCsv("name,name,\nAda,Lovelace,math\n");

    expect(table.headers).toEqual(["name", "name_2", "column_3"]);
  });

  it("rejects an empty file", () => {
    expect(() => parseCsv("\n\n")).toThrow("does not contain any rows");
  });
});
