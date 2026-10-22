# Résumé bullets for TidyProof

## 中文版

**TidyProof | 多格式数据质量检视与清洗工具 | 独立开发**

- 独立设计并开发纯前端数据质量平台，支持 CSV、TSV、JSON、XLSX、XLS、XLSM、XLSB 和 ODS 文件，实现文件拖拽上传、字段类型推断、缺失值统计、重复记录识别与 IQR 异常值检测。
- 设计多工作表 Excel 导入与切换流程，支持中文 GB18030/UTF-8 编码识别、原格式清洗导出和 JSON 质量报告生成，数据全程在浏览器本地处理。
- 构建数据画像与清洗前后对比可视化能力，为数值字段生成共享尺度的直方图，为分类和日期字段生成频数对比，并展示行数、缺失率、重复行、异常值和质量分变化。
- 设计可配置数据校验规则引擎，支持必填、唯一性、数值范围、枚举值及正则校验，将违规记录定位到具体行号，并在质量报告中保留清洗前后的规则结果。
- 基于 TypeScript 实现可复用数据质量规则引擎，将完整度、唯一性和类型一致性组合为可解释的质量评分，并通过 Vitest 覆盖解析异常、类型推断、清洗规则及核心指标。
- 使用 React、Vite、Papa Parse 与 SheetJS 构建响应式交互界面，通过按需加载控制 Excel 解析开销，并配置 Vitest、GitHub Actions 与 GitHub Pages 自动化测试和发布。
- 配置 GitHub Actions 自动化测试、生产构建与 GitHub Pages 发布，使用语义化表格、键盘焦点样式和减少动态效果设置提升可访问性。

可替换为英文岗位的要点：

- Built a privacy-first, multi-format data quality tool with React and TypeScript, supporting Excel, CSV, TSV, JSON, and ODS inputs with worksheet selection and format-aware exports.
- Added before/after data profiling with aligned numeric histograms, category frequencies, quality metrics, and row-level custom validation rules.
- Implemented a tested quality engine for type inference, missingness, duplicate detection, IQR outliers, and explainable weighted scoring.
- Added automated testing and CI/CD with Vitest and GitHub Actions, then deployed the production build to GitHub Pages.

## Avoid claiming

Do not add user counts, time savings, data volume, or accuracy percentages unless you have measured them. The current project facts are strong enough without invented impact metrics.
