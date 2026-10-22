import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createCleanFile, formatFromName, parseExcelBytes, parseJsonText } from "./files";

describe("file formats", () => {
  it("recognizes supported tabular extensions", () => {
    expect(formatFromName("orders.XLSX")).toBe("xlsx");
    expect(formatFromName("events.tsv")).toBe("tsv");
    expect(() => formatFromName("report.pdf")).toThrow("Choose a CSV");
  });

  it("reads every non-empty workbook sheet with Chinese values intact", async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["城市", "人口"],
        ["北京", 2189],
        ["上海", 2487],
      ]),
      "城市",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["目标", "年份"],
        ["信息安全", 2022],
      ]),
      "政策目标",
    );

    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    const tables = await parseExcelBytes(bytes, "中文数据.xlsx");

    expect(tables.map((table) => table.sheetName)).toEqual(["城市", "政策目标"]);
    expect(tables[0].headers).toEqual(["城市", "人口"]);
    expect(tables[0].rows[0]).toEqual(["北京", "2189"]);
    expect(tables[1].rows[0]).toEqual(["信息安全", "2022"]);
  });

  it("converts object arrays to a rectangular JSON table", () => {
    const table = parseJsonText(
      JSON.stringify([
        { city: "北京", population: 2189 },
        { city: "上海", population: 2487, region: "华东" },
      ]),
      "cities.json",
    );

    expect(table.headers).toEqual(["city", "population", "region"]);
    expect(table.rows[1]).toEqual(["上海", "2487", "华东"]);
  });

  it("exports a cleaned Excel workbook that can be read again", async () => {
    const table = (
      await parseExcelBytes(
        XLSX.write(
          (() => {
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(
              workbook,
              XLSX.utils.aoa_to_sheet([
                ["城市", "人口"],
                ["北京", 2189],
              ]),
              "数据",
            );
            return workbook;
          })(),
          { type: "array", bookType: "xlsx" },
        ),
        "cities.xlsx",
      )
    )[0];

    const output = await createCleanFile(table);
    expect(output.name).toBe("cities-数据-cleaned.xlsx");
    expect(output.label).toBe("Download clean Excel");

    const workbook = XLSX.read(output.data, { type: "array" });
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets["数据"], { header: 1 });
    expect(rows[1]).toEqual(["北京", "2189"]);
  });
});
