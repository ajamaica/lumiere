---
name: audit-case-rag
description: Local-first, event-driven RAG for commercial real estate audit & investigation case folders. Index a case directory named like "项目问题编号__标题" (with stage subfolders such as 01_policy_basis/02_process/04_settlement_payment) and query it with citations (file:// links + PDF #page). Use when you need to organize 50-200 mixed documents (PDF/DOCX/PPTX/XLSX) per case, enforce case_id+stage filtering, retrieve evidence fast, and answer questions with page-level references for workpapers, 整改闭环, or 举报线索调查.
---

# audit-case-rag

This skill packages a **local-only** workflow to build a searchable evidence index for a single audit/investigation case and query it with **page-level citations**.

## Workflow

### 0) Prepare a case folder (事件驱动)

Create a case directory named:

- `<项目问题编号>__<标题>`

Inside, use stage folders (stage is inferred from folder name):

- `01_policy_basis/` (basis) — 制度/流程/授权
- `02_process/` (process) — 招采/定标/过程证据
- `03_contract/` (contract) — 合同/补充协议
- `04_settlement_payment/` (payment) — 结算/付款/发票/验收
- `05_comm/` (comm) — 邮件/会议纪要/IM
- `06_interviews/` (interview) — 访谈/笔录/询证
- `07_workpapers/` (workpaper) — 底稿/抽样/复核表
- `09_rectification/` (rectification) — 整改/闭环

Full template: `references/case-folder-template.md`

### 1) Install dependencies (local)

From the skill folder (or copy the script into your repo):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r scripts/requirements.txt
```

LibreOffice is recommended for Office→PDF page citations:

- `soffice` must be available (PATH) or pass `--soffice /path/to/soffice`.

### 2) Index the case

```bash
./scripts/audit_case_rag.py index \
  --case-dir "/path/to/<项目问题编号>__<标题>" \
  --out-dir  "/path/to/audit_rag_db"
```

Outputs:

- `manifest.jsonl` written into the case directory
- `audit_rag_db/<case_id>.joblib` (persistent local index)

### 3) Query with event filters

```bash
./scripts/audit_case_rag.py query \
  --case "<项目问题编号>" \
  --stage payment \
  "付款节点是否倒挂？请给出处页码"
```

Notes:

- Evidence lines include clickable `file://...#page=N` citations when possible.
- Retrieval is **hybrid**: embedding recall + TF‑IDF rerank (alpha configurable).

## Safety/Privacy

- No cloud APIs. Everything runs locally.
- Do not commit outputs (indices, converted PDFs) to git.
