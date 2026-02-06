"""SkillGuard CLI — command-line interface for skill-scan."""

from __future__ import annotations

import argparse
import json
import sys
import os
import subprocess
from pathlib import Path


ALERT_RISK_ORDER = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def _send_alert(message: str) -> bool:
    channel = os.environ.get("OPENCLAW_ALERT_CHANNEL")
    if not channel:
        print("⚠️ OPENCLAW_ALERT_CHANNEL not set; alert not sent.", file=sys.stderr)
        return False
    cmd = ["openclaw", "message", "send", "--channel", channel, "--message", message]
    target = os.environ.get("OPENCLAW_ALERT_TO")
    if target:
        cmd += ["--target", target]
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except Exception as e:
        print(f"⚠️ Failed to send alert: {e}", file=sys.stderr)
        return False

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="skill-scan",
        description="SkillGuard v0.3.0 \u2014 Agent Security Scanner",
    )
    subparsers = parser.add_subparsers(dest="command")

    # scan
    scan_parser = subparsers.add_parser("scan", help="Scan a local skill directory")
    scan_parser.add_argument("path", nargs="?", default=".", help="Path to skill directory")
    scan_parser.add_argument("--json", dest="output_json", action="store_true", help="Output raw JSON report")
    scan_parser.add_argument("--compact", action="store_true", help="Output compact format (for chat)")
    scan_parser.add_argument("--quiet", action="store_true", help="Only output score and verdict")
    scan_parser.add_argument("--llm", action="store_true", help="Always run LLM deep analysis alongside pattern scan")
    scan_parser.add_argument("--llm-only", action="store_true", help="Skip pattern layers, run LLM analysis only")
    scan_parser.add_argument("--llm-auto", action="store_true", help="Run LLM only when pattern scan finds MEDIUM+ risk")
    scan_parser.add_argument("--alert", action="store_true", help="Send alert via OpenClaw channel if risk meets threshold")
    scan_parser.add_argument("--alert-threshold", choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                             default="MEDIUM", help="Minimum risk to trigger alert (default: MEDIUM)")

    # scan-hub
    hub_parser = subparsers.add_parser("scan-hub", help="Download and scan a ClawHub skill")
    hub_parser.add_argument("slug", help="ClawHub skill slug")
    hub_parser.add_argument("--json", dest="output_json", action="store_true")
    hub_parser.add_argument("--compact", action="store_true")
    hub_parser.add_argument("--llm", action="store_true")
    hub_parser.add_argument("--llm-only", action="store_true")
    hub_parser.add_argument("--llm-auto", action="store_true")
    hub_parser.add_argument("--alert", action="store_true", help="Send alert via OpenClaw channel if risk meets threshold")
    hub_parser.add_argument("--alert-threshold", choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                            default="MEDIUM", help="Minimum risk to trigger alert (default: MEDIUM)")

    # check
    check_parser = subparsers.add_parser("check", help='Check text for prompt injection/threats')
    check_parser.add_argument("text", nargs="+", help="Text to check")

    # batch
    batch_parser = subparsers.add_parser("batch", help="Scan all subdirectories as skills")
    batch_parser.add_argument("dir", nargs="?", default=".", help="Parent directory")
    batch_parser.add_argument("--json", dest="output_json", action="store_true")
    batch_parser.add_argument("--alert", action="store_true", help="Send alert via OpenClaw channel if any skill meets threshold")
    batch_parser.add_argument("--alert-threshold", choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"],
                              default="MEDIUM", help="Minimum risk to trigger alert (default: MEDIUM)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    # Lazy imports to avoid loading everything for --help
    from .scanner import SkillScanner
    from .reporter import format_text_report, format_compact_report

    rules = _load_rules()
    llm_options = {}
    if hasattr(args, "llm"):
        llm_options = {
            "llm": getattr(args, "llm", False),
            "llmOnly": getattr(args, "llm_only", False),
            "llmAuto": getattr(args, "llm_auto", False),
        }
    scanner = SkillScanner(rules, llm_options)

    if args.command == "scan":
        target_path = str(Path(args.path).resolve())
        report = scanner.scan_directory(target_path)

        if getattr(args, "alert", False):
            risk = report.get("risk", "LOW")
            risk_val = ALERT_RISK_ORDER.get(risk, 0)
            threshold_val = ALERT_RISK_ORDER.get(args.alert_threshold, 1)
            if risk_val >= threshold_val:
                msg = "\n".join([
                    "Skill-Scan Alert",
                    f"Target: {target_path}",
                    f"Risk: {risk}",
                    f"Score: {report['score']}/100",
                    f"Findings: {len(report['findings'])}",
                ])
                _send_alert(msg)

        if args.output_json:
            print(json.dumps(report, indent=2, default=str))
        elif args.compact:
            print(format_compact_report(report))
        elif args.quiet:
            print(f"{report['score']}/100 {report.get('risk', 'LOW')} \u2014 {len(report['findings'])} finding(s)")
        else:
            print(format_text_report(report))

        sys.exit(1 if report["score"] < 50 else 0)

    elif args.command == "scan-hub":
        from .clawhub import download_skill_for_scan

        print(f"Downloading {args.slug} from ClawHub...", file=sys.stderr)
        try:
            download = download_skill_for_scan(args.slug)
        except RuntimeError as exc:
            print(f"Failed: {exc}", file=sys.stderr)
            sys.exit(1)

        try:
            report = scanner.scan_directory(download["path"])
            if getattr(args, "alert", False):
                risk = report.get("risk", "LOW")
                risk_val = ALERT_RISK_ORDER.get(risk, 0)
                threshold_val = ALERT_RISK_ORDER.get(args.alert_threshold, 1)
                if risk_val >= threshold_val:
                    msg = "\n".join([
                        "Skill-Scan Alert",
                        f"Target: {args.slug}",
                        f"Risk: {risk}",
                        f"Score: {report['score']}/100",
                        f"Findings: {len(report['findings'])}",
                    ])
                    _send_alert(msg)
            if args.output_json:
                print(json.dumps(report, indent=2, default=str))
            elif args.compact:
                print(format_compact_report(report, args.slug))
            else:
                print(format_text_report(report))
            sys.exit(1 if report["score"] < 50 else 0)
        finally:
            download["cleanup"]()

    elif args.command == "check":
        text = " ".join(args.text)
        findings = scanner.scan_content(text, "input")
        if not findings:
            print("\u2705 No threats detected.")
            sys.exit(0)

        print(f"\u26a0\ufe0f {len(findings)} finding(s):\n")
        for f in findings:
            print(f"  {f['severity'].upper()} [{f['ruleId']}] {f['title']}")
            print(f"    Match: {f.get('match', '')}")
            print()
        sys.exit(1)

    elif args.command == "batch":
        batch_dir = Path(args.dir).resolve()
        dirs = sorted(p for p in batch_dir.iterdir() if p.is_dir())

        print(f"Scanning {len(dirs)} skills in {batch_dir}...\n")

        results: list[dict] = []
        for d in dirs:
            report = scanner.scan_directory(str(d))
            results.append({
                "name": d.name,
                "score": report["score"],
                "risk": report.get("risk", "LOW"),
                "findings": len(report["findings"]),
            })
            if report["score"] >= 80:
                icon = "\u2705"
            elif report["score"] >= 50:
                icon = "\u26a0\ufe0f"
            else:
                icon = "\U0001f534"
            print(f"  {icon} {d.name:<30} {report['score']}/100  {report.get('risk', 'LOW'):<8} {len(report['findings'])} finding(s)")

        print(f"\n{len(results)} skills scanned.")
        dangerous = [r for r in results if r["score"] < 50]
        if dangerous:
            print(f"\U0001f534 {len(dangerous)} skill(s) flagged as HIGH/CRITICAL risk.")
        if getattr(args, "alert", False):
            threshold_val = ALERT_RISK_ORDER.get(args.alert_threshold, 1)
            flagged = [r for r in results if ALERT_RISK_ORDER.get(r.get("risk", "LOW"), 0) >= threshold_val]
            if flagged:
                sample = ", ".join([f"{r['name']}({r['risk']})" for r in flagged[:5]])
                more = f" (+{len(flagged) - 5} more)" if len(flagged) > 5 else ""
                msg = "\n".join([
                    "Skill-Scan Alert",
                    f"Target: {batch_dir}",
                    f"Flagged: {len(flagged)}",
                    f"Examples: {sample}{more}",
                ])
                _send_alert(msg)
        sys.exit(1 if dangerous else 0)

    else:
        print(f"Unknown command: {args.command}. Run skill-scan --help for usage.", file=sys.stderr)
        sys.exit(1)


def _load_rules() -> list[dict]:
    """Load rules from the bundled dangerous-patterns.json."""
    rules_path = Path(__file__).parent.parent / "rules" / "dangerous-patterns.json"
    data = json.loads(rules_path.read_text())
    return data["rules"]


if __name__ == "__main__":
    main()
