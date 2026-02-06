#!/usr/bin/env python3
"""audit-case-rag

Local-first, event-driven (case_id + stage) RAG helper for audit/investigation.

- Input: one case directory named like: <项目问题编号>__<标题>
- Inside: evidence folders (01_policy_basis/02_process/...)
- Output: persistent local indices (embedding + tf-idf) and a manifest.jsonl

This is intentionally dependency-light and avoids vector DBs for compatibility.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Optional

import joblib
import numpy as np
from fastembed import TextEmbedding
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer


STAGE_MAP = {
    "01_policy_basis": "basis",
    "02_process": "process",
    "03_contract": "contract",
    "04_settlement_payment": "payment",
    "05_comm": "comm",
    "06_interviews": "interview",
    "07_workpapers": "workpaper",
    "08_findings": "finding",
    "09_rectification": "rectification",
    "00_intake": "intake",
}

SUPPORTED_SUFFIXES = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"}
OFFICE_SUFFIXES = {".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"}


def expand(p: str) -> str:
    return os.path.expandvars(os.path.expanduser(p))


def infer_case_id(case_dir_name: str) -> str:
    return case_dir_name.split("__", 1)[0].strip()


def infer_stage_from_path(path: Path) -> Optional[str]:
    for part in path.parts:
        if part in STAGE_MAP:
            return STAGE_MAP[part]
    return None


@dataclass
class DiscoveredDoc:
    path: Path
    case_id: str
    stage: Optional[str]


def iter_docs_in_case(case_dir: Path) -> list[DiscoveredDoc]:
    case_id = infer_case_id(case_dir.name)
    docs: list[DiscoveredDoc] = []

    for p in case_dir.rglob("*"):
        if not p.is_file():
            continue
        if p.name.startswith("~$"):
            continue
        if p.suffix.lower() not in SUPPORTED_SUFFIXES:
            continue
        stage = infer_stage_from_path(p)
        docs.append(DiscoveredDoc(path=p, case_id=case_id, stage=stage))

    return docs


def write_manifest(case_dir: Path, docs: list[DiscoveredDoc]) -> Path:
    out = case_dir / "manifest.jsonl"
    with out.open("w", encoding="utf-8") as f:
        for d in docs:
            f.write(
                json.dumps(
                    {
                        "case_id": d.case_id,
                        "stage": d.stage,
                        "source_display": d.path.name,
                        "path": str(d.path),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )
    return out


def convert_to_pdf(input_path: Path, soffice: Path, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        str(soffice),
        "--headless",
        "--nologo",
        "--nofirststartwizard",
        "--convert-to",
        "pdf",
        "--outdir",
        str(out_dir),
        str(input_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(
            "LibreOffice conversion failed\n"
            f"cmd: {' '.join(cmd)}\n"
            f"stdout: {proc.stdout}\n"
            f"stderr: {proc.stderr}\n"
        )
    out_pdf = out_dir / f"{input_path.stem}.pdf"
    if out_pdf.exists():
        return out_pdf
    matches = list(out_dir.glob(f"{input_path.stem}*.pdf"))
    if matches:
        return matches[0]
    raise FileNotFoundError(f"Expected converted PDF not found under {out_dir}")


def extract_pdf_pages(pdf_path: Path) -> Iterable[tuple[int, str]]:
    reader = PdfReader(str(pdf_path))
    for i, page in enumerate(reader.pages, start=1):
        yield i, (page.extract_text() or "")


def chunk_text(text: str, max_chars: int = 2500, overlap: int = 200) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end])
        if end == len(text):
            break
        start = max(0, end - overlap)
    return chunks


def l2_normalize(x: np.ndarray) -> np.ndarray:
    denom = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
    return x / denom


def embed_texts(model_name: str, texts: list[str]) -> np.ndarray:
    model = TextEmbedding(model_name=model_name)
    vecs = list(model.embed(texts))
    arr = np.asarray(vecs, dtype=np.float32)
    return l2_normalize(arr)


def build_tfidf(texts: list[str]):
    # Char n-grams are a solid baseline for Chinese + mixed content.
    vec = TfidfVectorizer(analyzer="char", lowercase=False, ngram_range=(2, 5), max_features=300_000)
    mat = vec.fit_transform(texts)
    return vec, mat


def file_url(path: str) -> str:
    try:
        return Path(path).expanduser().resolve().as_uri()
    except Exception:
        return ""


def cite(meta: dict[str, Any]) -> str:
    src = meta.get("source")
    disp = meta.get("source_display") or (Path(src).name if src else "")
    t = meta.get("type")
    if t == "pdf":
        page = meta.get("page")
        url = file_url(src)
        url = f"{url}#page={page}" if url and page else url
        return f"{disp} p.{page} ({url})" if url else f"{disp} p.{page}"
    return disp


def cmd_index(args: argparse.Namespace) -> None:
    case_dir = Path(expand(args.case_dir)).resolve()
    if not case_dir.exists() or not case_dir.is_dir():
        raise SystemExit(f"case_dir not found: {case_dir}")

    out_dir = Path(expand(args.out_dir)).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    case_id = infer_case_id(case_dir.name)
    docs = iter_docs_in_case(case_dir)
    if not docs:
        raise SystemExit(f"No supported documents found under: {case_dir}")

    manifest_path = write_manifest(case_dir, docs)

    soffice = Path(expand(args.soffice)).resolve() if args.soffice else None
    pdf_cache = out_dir / "converted_pdf"

    texts: list[str] = []
    metas: list[dict[str, Any]] = []

    for d in docs:
        p = d.path
        suffix = p.suffix.lower()
        source_display = p.name
        source_path = p

        # convert Office to PDF for page citations
        if suffix in OFFICE_SUFFIXES:
            if not soffice or not soffice.exists():
                raise SystemExit(
                    "Office file found but soffice not available. Install LibreOffice and pass --soffice /path/to/soffice"
                )
            source_path = convert_to_pdf(p, soffice=soffice, out_dir=pdf_cache)
            suffix = ".pdf"

        if suffix != ".pdf":
            continue

        for page, page_text in extract_pdf_pages(source_path):
            meta0 = {
                "case_id": case_id,
                "stage": d.stage,
                "type": "pdf",
                "source": str(source_path),
                "source_display": source_display,
                "page": page,
            }
            for j, ch in enumerate(chunk_text(page_text, args.max_chars, args.overlap)):
                texts.append(ch)
                metas.append({**meta0, "chunk": j})

    if not texts:
        raise SystemExit("No text extracted; PDFs may be scanned images (OCR not implemented in this local-only script).")

    # Build indices
    vec, mat = build_tfidf(texts)
    embs = embed_texts(args.embedding_model, texts)

    bundle = {
        "version": 1,
        "case_id": case_id,
        "embedding_model": args.embedding_model,
        "texts": texts,
        "metas": metas,
        "tfidf_vectorizer": vec,
        "tfidf_matrix": mat,
        "embeddings": embs,
        "manifest": str(manifest_path),
    }

    out_path = out_dir / f"{case_id}.joblib"
    joblib.dump(bundle, out_path)

    print(f"[OK] Indexed case: {case_id}")
    print(f"     docs discovered: {len(docs)}")
    print(f"     chunks indexed:  {len(texts)}")
    print(f"     index path:      {out_path}")
    print(f"     manifest:        {manifest_path}")


def cmd_query(args: argparse.Namespace) -> None:
    out_dir = Path(expand(args.out_dir)).resolve()
    idx_path = out_dir / f"{args.case}.joblib"
    if not idx_path.exists():
        raise SystemExit(f"Index not found: {idx_path}. Run index first.")

    bundle = joblib.load(idx_path)
    texts: list[str] = bundle["texts"]
    metas: list[dict[str, Any]] = bundle["metas"]
    vec = bundle["tfidf_vectorizer"]
    mat = bundle["tfidf_matrix"]
    embs: np.ndarray = bundle["embeddings"]
    model_name: str = bundle["embedding_model"]

    q_emb = embed_texts(model_name, [args.question])[0]
    emb_scores = (embs @ q_emb).reshape(-1)

    # recall topN by embedding
    top_n = min(args.recall, len(emb_scores))
    cand = np.argpartition(-emb_scores, top_n - 1)[:top_n]

    # compute tfidf scores for all (cheap for this size)
    q_t = vec.transform([args.question])
    tf_scores = (mat @ q_t.T).toarray().reshape(-1)

    # combine
    alpha = args.alpha
    scored = []
    for i in cand:
        meta = metas[int(i)]
        if args.stage and meta.get("stage") != args.stage:
            continue
        s = (1 - alpha) * float(emb_scores[i]) + alpha * float(tf_scores[i])
        scored.append((s, int(i)))
    scored.sort(reverse=True, key=lambda x: x[0])

    k = min(args.k, len(scored))
    print(f"QUESTION: {args.question}")
    print("\nEVIDENCE:")
    for rank, (s, i) in enumerate(scored[:k], start=1):
        meta = metas[i]
        doc = texts[i].strip().replace("\n", " ")
        if len(doc) > 320:
            doc = doc[:320] + "…"
        print(f"[{rank}] {cite(meta)}  (score={s:.4f})")
        print(f"    {doc}\n")

    print("SOURCES:")
    for rank, (_, i) in enumerate(scored[:k], start=1):
        print(f"[{rank}] {cite(metas[i])}")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="audit-case-rag", description="Event-driven local RAG for audit cases")
    sub = p.add_subparsers(dest="cmd", required=True)

    pi = sub.add_parser("index", help="Index a case directory")
    pi.add_argument("--case-dir", required=True, help="Case directory named like: <项目问题编号>__<标题>")
    pi.add_argument("--out-dir", default="./audit_rag_db", help="Where to store indices")
    pi.add_argument("--soffice", default="soffice", help="Path to LibreOffice soffice (for Office->PDF)")
    pi.add_argument("--embedding-model", default="BAAI/bge-small-zh-v1.5")
    pi.add_argument("--max-chars", type=int, default=2500)
    pi.add_argument("--overlap", type=int, default=200)
    pi.set_defaults(func=cmd_index)

    pq = sub.add_parser("query", help="Query an indexed case")
    pq.add_argument("--case", required=True, help="Case id (项目问题编号)")
    pq.add_argument("question", metavar="QUESTION")
    pq.add_argument("--out-dir", default="./audit_rag_db")
    pq.add_argument("--stage", default=None, help="Filter to a stage (basis/process/contract/payment/...) ")
    pq.add_argument("--k", type=int, default=6)
    pq.add_argument("--recall", type=int, default=40)
    pq.add_argument("--alpha", type=float, default=0.35, help="Hybrid weight for TF-IDF (0..1)")
    pq.set_defaults(func=cmd_query)

    return p


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
