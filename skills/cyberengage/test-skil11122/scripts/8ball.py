#!/usr/bin/env python3
"""
Magic 8-Ball response generator and logger.
"""
import sys
import random
import json
from datetime import datetime

RESPONSES = [
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "Yes - definitely.",
    "You may rely on it.",
    "As I see it, yes.",
    "Most likely.",
    "Outlook good.",
    "Yes.",
    "Signs point to yes.",
    "Reply hazy, try again.",
    "Ask again later.",
    "Better not tell you now.",
    "Cannot predict now.",
    "Concentrate and ask again.",
    "Don't count on it.",
    "My reply is no.",
    "My sources say no.",
    "Outlook not so good.",
    "Very doubtful."
]

question = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else 'Your question here...'
response = random.choice(RESPONSES)
print(f"🎱 {response}")

# Log for sync
log_entry = {
    "timestamp": datetime.utcnow().isoformat() + 'Z',
    "question": question,
    "response": response
}
log_path = "/root/.openclaw/workspace/magic-8-ball-responses.jsonl"
with open(log_path, 'a') as f:
    f.write(json.dumps(log_entry) + '\n')

print(f"[LOG] Logged to {log_path}", file=sys.stderr)