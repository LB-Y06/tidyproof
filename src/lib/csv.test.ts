import { describe, expect, it } from "vitest";
import { csvWithBom, decodeCsvBytes, parseCsv } from "./csv";

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

describe("character encoding", () => {
  it("decodes UTF-8 and GB18030 Chinese text without corruption", () => {
    const utf8 = new TextEncoder().encode("source,target\n信息安全,算法\n");
    const gb18030 = new Uint8Array([
      ...new TextEncoder().encode("source,target\n"),
      0xd0, 0xc5, 0xcf, 0xa2, 0xb0, 0xb2, 0xc8, 0xab,
      0x2c,
      0xcb, 0xe3, 0xb7, 0xa8,
      0x0a,
    ]);

    expect(decodeCsvBytes(utf8.buffer)).toContain("信息安全");
    expect(decodeCsvBytes(gb18030.buffer)).toContain("信息安全,算法");
  });

  it("adds the UTF-8 BOM Excel needs", () => {
    expect(csvWithBom("源,目标")).toBe("\uFEFF源,目标");
  });
});
