#!/usr/bin/env python3
"""Utility for analyzing and editing CSV/Excel files with pandas."""
from __future__ import annotations

import argparse
import io
import sys
import textwrap
from pathlib import Path
from typing import Iterable, Sequence

import pandas as pd

PREVIEW_ROWS = 5


def detect_path(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in {".csv", ".tsv", ".txt", ".xlsx", ".xls", ".xlsm", ".xlsb"}:
        return suffix
    raise ValueError(f"Unsupported spreadsheet format: {suffix}")


def load_dataframe(path: Path, sheet: str | None, delimiter: str, encoding: str) -> pd.DataFrame:
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls", ".xlsm", ".xlsb"}:
        return pd.read_excel(path, sheet_name=sheet)
    sep = "\t" if suffix == ".tsv" else delimiter
    return pd.read_csv(path, sep=sep, encoding=encoding)


def save_dataframe(df: pd.DataFrame, path: Path, engine: str | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    suffix = path.suffix.lower()
    if suffix in {".xlsx", ".xls"}:
        df.to_excel(path, index=False, engine=engine or "openpyxl")
    elif suffix == ".tsv" or suffix == ".txt":
        df.to_csv(path, index=False, sep="\t")
    elif suffix == ".csv":
        df.to_csv(path, index=False)
    else:
        raise ValueError(f"Unsupported export format: {suffix}")


def format_missing(df: pd.DataFrame) -> Sequence[tuple[str, float]]:
    missing = df.isna().mean()
    return [(col, pct) for col, pct in missing.items() if pct > 0]


def print_summary(df: pd.DataFrame) -> None:
    print(f"Shape: {df.shape[0]} rows × {df.shape[1]} columns")
    dtype_counts = df.dtypes.value_counts()
    print("Column types:")
    for dtype, count in dtype_counts.items():
        print(f"  {dtype}: {count}")
    missing = format_missing(df)
    if missing:
        print("Columns with missing values (percent):")
        for col, pct in sorted(missing, key=lambda item: item[1], reverse=True):
            print(f"  {col}: {pct:.1%}")
    else:
        print("No missing values detected.")
    print("Top cardinality (sample values):")
    for col in df.columns[:5]:
        unique = df[col].nunique(dropna=True)
        sample = df[col].dropna().unique()[:3]
        print(f"  {col}: {unique} unique, sample {list(sample)}")


def show_info(df: pd.DataFrame) -> None:
    buffer = io.StringIO()
    df.info(buf=buffer, memory_usage="deep")
    print(buffer.getvalue().rstrip())


def show_preview(df: pd.DataFrame, rows: int, tail: bool) -> None:
    print("Preview:")
    target = df.tail(rows) if tail else df.head(rows)
    print(target.to_markdown(index=False))


def run_summary(args: argparse.Namespace) -> None:
    df = load_dataframe(Path(args.path), args.sheet, args.delimiter, args.encoding)
    print_summary(df)
    if args.rows:
        show_preview(df, args.rows, args.tail)


def run_describe(args: argparse.Namespace) -> None:
    df = load_dataframe(Path(args.path), args.sheet, args.delimiter, args.encoding)
    include = args.include or "all"
    describe = df.describe(include=include, datetime_is_numeric=True)
    if args.percentiles:
        describe = df.describe(include=include, percentiles=[p / 100 for p in args.percentiles],
                               datetime_is_numeric=True)
    print(describe)


def run_preview(args: argparse.Namespace) -> None:
    df = load_dataframe(Path(args.path), args.sheet, args.delimiter, args.encoding)
    show_preview(df, args.rows, args.tail)


def run_filter(args: argparse.Namespace) -> None:
    df = load_dataframe(Path(args.path), args.sheet, args.delimiter, args.encoding)
    if not args.query:
        raise SystemExit("--query expression is required for filter")
    result = df.query(args.query, engine="python")
    if args.sample:
        result = result.sample(min(args.sample, len(result)))
    if args.output:
        save_dataframe(result, Path(args.output))
        print(f"Filtered output written to {args.output}")
    else:
        show_preview(result, args.rows or PREVIEW_ROWS, args.tail)


def run_transform(args: argparse.Namespace) -> None:
    df = load_dataframe(Path(args.path), args.sheet, args.delimiter, args.encoding)
    if not args.expr:
        raise SystemExit("At least one --expr is required for transform")
    for expr in args.expr:
        df.eval(expr, inplace=True, engine="python")
    if args.drop:
        df.drop(columns=args.drop, errors="ignore", inplace=True)
    if args.rename:
        rename_map = dict(pair.split(":", 1) for pair in args.rename)
        df.rename(columns=rename_map, inplace=True)
    if args.output or args.inplace:
        dest = Path(args.output) if args.output else Path(args.path)
        save_dataframe(df, dest)
        print(f"Transformations saved to {dest}")
    else:
        show_preview(df, args.rows or PREVIEW_ROWS, args.tail)


def run_convert(args: argparse.Namespace) -> None:
    df = load_dataframe(Path(args.path), args.sheet, args.delimiter, args.encoding)
    target = Path(args.output)
    save_dataframe(df, target, engine=args.engine)
    print(f"Converted {args.path} → {target}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Sheetsmith: inspect, summarize, and edit CSV/Excel files with pandas",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parent = argparse.ArgumentParser(add_help=False)
    parent.add_argument("--sheet", help="Excel sheet name or index")
    parent.add_argument("--delimiter", "-d", default=",",
                        help="Default CSV separator (ignored for Excel)")
    parent.add_argument("--encoding", default="utf-8", help="File encoding for text files")

    subparsers = parser.add_subparsers(dest="command", required=True)

    summary_parser = subparsers.add_parser("summary", parents=[parent], help="High-level summary")
    summary_parser.add_argument("path", help="Path to CSV/Excel file")
    summary_parser.add_argument("--rows", type=int, help="Preview rows after summary")
    summary_parser.add_argument("--tail", action="store_true", help="Show tail instead of head")
    summary_parser.set_defaults(func=run_summary)

    describe_parser = subparsers.add_parser("describe", parents=[parent], help="Pandas describe report")
    describe_parser.add_argument("path", help="Path to CSV/Excel file")
    describe_parser.add_argument("--include", choices=["all", "object", "number", "datetime"],
                                 help="Which dtypes to include in describe")
    describe_parser.add_argument("--percentiles", type=int, nargs="*",
                                 help="Additional percentile values (0-100)")
    describe_parser.set_defaults(func=run_describe)

    preview_parser = subparsers.add_parser("preview", parents=[parent], help="Quick head/tail preview")
    preview_parser.add_argument("path", help="Path to file")
    preview_parser.add_argument("--rows", type=int, default=5)
    preview_parser.add_argument("--tail", action="store_true")
    preview_parser.set_defaults(func=run_preview)

    filter_parser = subparsers.add_parser("filter", parents=[parent], help="Filter rows with pandas query")
    filter_parser.add_argument("path", help="Source file")
    filter_parser.add_argument("--query", required=True, help="pandas query, e.g., 'state == \"CA\"'")
    filter_parser.add_argument("--rows", type=int, help="Preview rows when not writing")
    filter_parser.add_argument("--tail", action="store_true")
    filter_parser.add_argument("--sample", type=int, help="Return a random sample of the matches")
    filter_parser.add_argument("--output", help="Write filtered rows to this path")
    filter_parser.set_defaults(func=run_filter)

    transform_parser = subparsers.add_parser("transform", parents=[parent],
                                             help="Add/rename/drop columns via pandas expressions")
    transform_parser.add_argument("path", help="Source file")
    transform_parser.add_argument("--expr", action="append",
                                  help="Expression, e.g., 'total=quantity*price'",)
    transform_parser.add_argument("--drop", nargs="*", help="Columns to drop")
    transform_parser.add_argument("--rename", nargs="*",
                                  help="Rename mappings (old:new). Example: --rename foo:bar baz:q1")
    transform_parser.add_argument("--output", help="Save transformed dataframe to this path")
    transform_parser.add_argument("--inplace", action="store_true",
                                  help="Overwrite the source file")
    transform_parser.add_argument("--rows", type=int, help="Show preview rows when not writing")
    transform_parser.add_argument("--tail", action="store_true")
    transform_parser.set_defaults(func=run_transform)

    convert_parser = subparsers.add_parser("convert", parents=[parent], help="Convert between formats")
    convert_parser.add_argument("path", help="Source file")
    convert_parser.add_argument("--output", required=True, help="Target file (csv, tsv, xlsx)")
    convert_parser.add_argument("--engine", help="Excel engine override (openpyxl/xlsxwriter)")
    convert_parser.set_defaults(func=run_convert)

    args = parser.parse_args()
    try:
        args.func(args)
    except Exception as exc:  # pragma: no cover - best effort
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
