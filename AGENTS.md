# TidyProof project invariants

- Never decode imported files with `File.text()` or assume UTF-8. Use `decodeCsvBytes` so Chinese GB18030 files remain intact.
- CSV and TSV exports must remain UTF-8 with a BOM for Excel compatibility.
- When changing import or export code, test at least one real Chinese GB18030 file and one XLSX workbook with Chinese text.
- Keep file processing in the browser. Do not upload user data or add a server-side fallback.
- Preserve every readable Excel worksheet and expose a sheet selector instead of silently choosing or combining sheets.
- Run `npm test`, `npm run build`, and a browser smoke test before deploying.
