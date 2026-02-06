#!/usr/bin/env python3
import argparse
import json
import sys
from datetime import datetime

# This script prints JSON describing the cron job creation request.
# The agent will call the cron tool with this payload (safer than shelling openclaw CLI).


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--name', required=True)
  ap.add_argument('--at', required=True, help='ISO8601 timestamp with tz offset')
  ap.add_argument('--chat-id', required=True)
  ap.add_argument('--message', required=True)
  args = ap.parse_args()

  # We output a canonical job object; the agent should pass it to the cron tool.
  # Using isolated agentTurn so it can deliver to Telegram without needing main-session systemEvent.
  job = {
    "name": args.name,
    "schedule": {"kind": "at", "atMs": int(datetime.fromisoformat(args.at).timestamp()*1000)},
    "payload": {
      "kind": "agentTurn",
      "message": (
        "Envía este recordatorio por Telegram. No hagas preguntas. "
        f"Texto: ⏰ Recordatorio: {args.message}"
      ),
      "timeoutSeconds": 60,
      "deliver": True,
      "channel": "telegram",
      "to": str(args.chat_id)
    },
    "sessionTarget": "isolated",
    "enabled": True
  }

  print(json.dumps(job, ensure_ascii=False))


if __name__ == '__main__':
  main()
