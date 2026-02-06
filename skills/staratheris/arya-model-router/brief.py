#!/usr/bin/env python3
"""Create a compact brief from long context.

Input: text (stdin) + max_chars.
Output: brief text (stdout).

This is intentionally simple (no model calls) to keep it safe/offline.
Strategy:
- Keep first N chars (task framing)
- Keep last N chars (recent)
- Extract lines that look like commands/errors/IDs/URLs
"""

import argparse
import re
import sys


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--max-chars', type=int, default=4000)
    args = ap.parse_args()

    text = sys.stdin.read()
    if len(text) <= args.max_chars:
        sys.stdout.write(text)
        return

    head = text[:1200]
    tail = text[-1200:]

    interesting = []
    for line in text.splitlines():
        if re.search(r"https?://|\b(job id|job_id|message_id|error|exception|traceback|failed|403|cron|gog|wacli|openclaw)\b", line, re.I):
            interesting.append(line.strip())
    interesting = [l for l in interesting if l]
    interesting = interesting[:80]

    out = []
    out.append("[BRIEF_HEAD]\n" + head)
    out.append("\n[BRIEF_INTERESTING_LINES]\n" + "\n".join(interesting))
    out.append("\n[BRIEF_TAIL]\n" + tail)

    brief = "\n".join(out)
    sys.stdout.write(brief[: args.max_chars])


if __name__ == '__main__':
    main()
