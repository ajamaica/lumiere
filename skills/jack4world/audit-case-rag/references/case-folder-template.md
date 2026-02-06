# Audit Case Folder Template (事件驱动)

Case directory naming:

- `<项目问题编号>__<标题>`

Suggested subfolders (stage inference):

- `00_intake/` → `intake`
- `01_policy_basis/` → `basis`
- `02_process/` → `process`
- `03_contract/` → `contract`
- `04_settlement_payment/` → `payment`
- `05_comm/` → `comm`
- `06_interviews/` → `interview`
- `07_workpapers/` → `workpaper`
- `08_findings/` → `finding`
- `09_rectification/` → `rectification`

Supported file types:

- PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX

Output files created:

- `manifest.jsonl` (written into the case directory)
- `<out_dir>/<case_id>.joblib` (local persistent index)
