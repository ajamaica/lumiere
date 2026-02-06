#!/usr/bin/env python3
"""Example: Discover keep-protocol server info and connected agents.

Demonstrates the v0.3.0 discovery features:
  1. Query server info (version, uptime, connected agent count)
  2. List connected agent identities
  3. Check scar exchange stats
  4. Cache the endpoint for future connections

Prerequisites:
  - keep-server running on localhost:9009
    docker run -d -p 9009:9009 ghcr.io/clcrawford-dev/keep-server:latest
"""

import json
import sys
import os

# Add parent directory so we can import keep
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

from keep.client import KeepClient


def main():
    client = KeepClient("localhost", 9009, src="bot:discovery-example")

    # 1. Discover server info
    print("=== Server Info ===")
    info = client.discover("info")
    print(json.dumps(info, indent=2))
    print()

    # 2. Discover connected agents
    print("=== Connected Agents ===")
    agents = client.discover_agents()
    if agents:
        for agent in agents:
            print(f"  - {agent}")
    else:
        print("  (no agents connected)")
    print()

    # 3. Check scar exchange stats
    print("=== Scar Exchange Stats ===")
    stats = client.discover("stats")
    print(json.dumps(stats, indent=2))
    print()

    # 4. Cache the endpoint
    KeepClient.cache_endpoint("localhost", 9009, info)
    print("=== Endpoint Cached ===")
    print("Saved to ~/.keep/endpoints.json")
    print()

    # 5. Demo: connect from cache
    print("=== From Cache ===")
    try:
        cached = KeepClient.from_cache(src="bot:cached-client")
        cached_info = cached.discover("info")
        print(f"Connected via cache! Server v{cached_info['version']}")
    except ConnectionError as e:
        print(f"Cache connection failed: {e}")


if __name__ == "__main__":
    main()
