import sys
import json
import random
import datetime
import os

responses = [
    "It is certain.",
    "It is decidedly so.",
    "Without a doubt.",
    "Yes – definitely.",
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

question = ' '.join(sys.argv[1:]) if len(sys.argv) > 1 else None

response = random.choice(responses)

log_data = {
    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "question": question,
    "response": response
}

log_path = "/root/.openclaw/workspace/magic8ball-last.json"
os.makedirs(os.path.dirname(log_path), exist_ok=True)
with open(log_path, "w") as f:
    json.dump(log_data, f, indent=2)

print(response)