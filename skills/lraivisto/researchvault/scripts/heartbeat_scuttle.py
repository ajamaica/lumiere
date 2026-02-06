import sys
import os
import json

# Add parent dir to path to import core if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import scripts.core as core
from scripts.scuttle import MoltbookScuttler

def main():
    ms = MoltbookScuttler()
    
    # Simulate fetching from Moltbook
    data = ms.scuttle("moltbook://feed/latest")
    
    core.log_event(
        project_id="agent-pulse",
        event_type=data["type"],
        step=0,
        payload={"title": data["title"], "content": data["content"]},
        confidence=data["confidence"],
        source=data["source"],
        tags=data["tags"]
    )
    print(f"Logged Moltbook signal to 'agent-pulse': {data['title']}")

if __name__ == "__main__":
    main()
