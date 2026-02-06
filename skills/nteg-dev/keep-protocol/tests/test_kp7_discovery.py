#!/usr/bin/env python3
"""KP-10: Test KP-7 Discovery Features

7-section test plan for keep-protocol v0.3.0 discovery features.
Run with server active: ./keep (Go) or Docker container on localhost:9009

Usage:
    python3 tests/test_kp7_discovery.py

Requires:
    - Server running on localhost:9009
    - Python packages: pip install -e python/
"""

import json
import os
import sys
import time
from pathlib import Path

# Add the Python SDK to path
sys.path.insert(0, str(Path(__file__).parent.parent / "python"))

from keep.client import KeepClient

# Test configuration
HOST = os.environ.get("KEEP_HOST", "localhost")
PORT = int(os.environ.get("KEEP_PORT", "9009"))

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
SKIP = "\033[93m- SKIP\033[0m"


def section(num: int, title: str):
    print(f"\n{'='*60}")
    print(f"Section {num}: {title}")
    print(f"{'='*60}")


def test(name: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    print(f"  {status} {name}")
    if detail:
        print(f"        {detail}")
    return condition


def main():
    results = {"passed": 0, "failed": 0, "skipped": 0}

    print(f"\nKP-10: Testing KP-7 Discovery Features")
    print(f"Target: {HOST}:{PORT}")
    print(f"{'='*60}")

    # Verify server connectivity first
    try:
        client = KeepClient(HOST, PORT, timeout=5.0)
        reply = client.send(body="ping", dst="server")
        if reply.body != "done":
            print(f"\n{FAIL} Server not responding correctly (got: {reply.body})")
            return 1
    except Exception as e:
        print(f"\n{FAIL} Cannot connect to server at {HOST}:{PORT}")
        print(f"    Error: {e}")
        print(f"\nStart server first:")
        print(f"    go build -o keep . && ./keep")
        print(f"    OR")
        print(f"    docker build -t keep-server . && docker run -p 9009:9009 keep-server")
        return 1

    print(f"{PASS} Server connection verified\n")

    # ============================================================
    # Section 1: discover:info
    # ============================================================
    section(1, "discover:info - Server metadata")

    try:
        info = client.discover("info")

        if test("Returns dict", isinstance(info, dict)):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Contains 'version'", "version" in info, f"version={info.get('version')}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Version is '0.3.0'", info.get("version") == "0.3.0"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Contains 'agents_online'", "agents_online" in info, f"agents_online={info.get('agents_online')}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Contains 'uptime_sec'", "uptime_sec" in info, f"uptime_sec={info.get('uptime_sec')}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("uptime_sec is integer >= 0", isinstance(info.get("uptime_sec"), int) and info.get("uptime_sec") >= 0):
            results["passed"] += 1
        else:
            results["failed"] += 1

    except Exception as e:
        print(f"  {FAIL} discover:info raised exception: {e}")
        results["failed"] += 6

    # ============================================================
    # Section 2: discover:agents - Connected agents list
    # ============================================================
    section(2, "discover:agents - Connected agents list")

    try:
        agents_response = client.discover("agents")

        if test("Returns dict", isinstance(agents_response, dict)):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Contains 'agents' key", "agents" in agents_response):
            results["passed"] += 1
        else:
            results["failed"] += 1

        agents_list = agents_response.get("agents", [])
        if test("'agents' is a list", isinstance(agents_list, list), f"agents={agents_list}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        # Test discover_agents() helper
        agents_via_helper = client.discover_agents()
        if test("discover_agents() returns list", isinstance(agents_via_helper, list)):
            results["passed"] += 1
        else:
            results["failed"] += 1

    except Exception as e:
        print(f"  {FAIL} discover:agents raised exception: {e}")
        results["failed"] += 4

    # ============================================================
    # Section 3: discover:stats - Scar/barter statistics
    # ============================================================
    section(3, "discover:stats - Scar/barter statistics")

    try:
        stats = client.discover("stats")

        if test("Returns dict", isinstance(stats, dict)):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Contains 'scar_exchanges'", "scar_exchanges" in stats):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("Contains 'total_packets'", "total_packets" in stats, f"total_packets={stats.get('total_packets')}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if test("scar_exchanges is dict", isinstance(stats.get("scar_exchanges"), dict)):
            results["passed"] += 1
        else:
            results["failed"] += 1

    except Exception as e:
        print(f"  {FAIL} discover:stats raised exception: {e}")
        results["failed"] += 4

    # ============================================================
    # Section 4: Endpoint caching - ~/.keep/endpoints.json
    # ============================================================
    section(4, "Endpoint caching - ~/.keep/endpoints.json")

    try:
        cache_dir = Path.home() / ".keep"
        cache_file = cache_dir / "endpoints.json"

        # Clear existing cache for clean test
        if cache_file.exists():
            cache_file.unlink()

        # Cache the current endpoint
        info = client.discover("info")
        KeepClient.cache_endpoint(HOST, PORT, info)

        if test("Cache file created", cache_file.exists()):
            results["passed"] += 1
        else:
            results["failed"] += 1

        # Read and validate cache
        cache_data = json.loads(cache_file.read_text())

        if test("Cache has 'endpoints' key", "endpoints" in cache_data):
            results["passed"] += 1
        else:
            results["failed"] += 1

        endpoints = cache_data.get("endpoints", [])
        if test("Cache has at least 1 endpoint", len(endpoints) >= 1):
            results["passed"] += 1
        else:
            results["failed"] += 1

        if endpoints:
            ep = endpoints[0]
            if test("Endpoint has host", ep.get("host") == HOST):
                results["passed"] += 1
            else:
                results["failed"] += 1

            if test("Endpoint has port", ep.get("port") == PORT):
                results["passed"] += 1
            else:
                results["failed"] += 1

            if test("Endpoint has version", "version" in ep, f"version={ep.get('version')}"):
                results["passed"] += 1
            else:
                results["failed"] += 1

            if test("Endpoint has last_seen timestamp", "last_seen" in ep, f"last_seen={ep.get('last_seen')}"):
                results["passed"] += 1
            else:
                results["failed"] += 1

    except Exception as e:
        print(f"  {FAIL} Endpoint caching raised exception: {e}")
        results["failed"] += 7

    # ============================================================
    # Section 5: from_cache() - Client reconnection
    # ============================================================
    section(5, "from_cache() - Client reconnection")

    try:
        # Reconnect using cached endpoints
        cached_client = KeepClient.from_cache(src="bot:kp10-test-cached")

        if test("from_cache() returns KeepClient", isinstance(cached_client, KeepClient)):
            results["passed"] += 1
        else:
            results["failed"] += 1

        # Verify cached client can discover
        info = cached_client.discover("info")
        if test("Cached client can call discover()", "version" in info):
            results["passed"] += 1
        else:
            results["failed"] += 1

    except Exception as e:
        print(f"  {FAIL} from_cache() raised exception: {e}")
        results["failed"] += 2

    # ============================================================
    # Section 6: Scar logging - Verify scar packets tracked
    # ============================================================
    section(6, "Scar logging - Verify scar packets tracked")

    try:
        # Get baseline stats
        stats_before = client.discover("stats")
        packets_before = stats_before.get("total_packets", 0)

        # Send a packet with scar data
        test_scar = b"test-scar-data-kp10"
        scar_client = KeepClient(HOST, PORT, src="bot:kp10-scar-test")
        reply = scar_client.send(body="scar test", dst="server", scar=test_scar)

        if test("Scar packet accepted (reply=done)", reply.body == "done"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        # Get stats after
        stats_after = client.discover("stats")
        packets_after = stats_after.get("total_packets", 0)

        if test("total_packets incremented", packets_after > packets_before,
                f"before={packets_before}, after={packets_after}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

        # Check scar_exchanges has our agent
        scar_exchanges = stats_after.get("scar_exchanges", {})
        if test("scar_exchanges tracks scar sender", "bot:kp10-scar-test" in scar_exchanges,
                f"scar_exchanges={scar_exchanges}"):
            results["passed"] += 1
        else:
            results["failed"] += 1

    except Exception as e:
        print(f"  {FAIL} Scar logging raised exception: {e}")
        results["failed"] += 3

    # ============================================================
    # Section 7: Error handling - Unknown discovery type
    # ============================================================
    section(7, "Error handling - Unknown discovery type")

    try:
        bad_response = client.discover("invalid_type_xyz")

        # Should return error:unknown_discovery
        if test("Unknown type returns error",
                bad_response == "error:unknown_discovery" or
                (isinstance(bad_response, dict) and "error" in str(bad_response))):
            results["passed"] += 1
        else:
            print(f"        Got: {bad_response}")
            results["failed"] += 1

    except json.JSONDecodeError:
        # If response is not JSON, might be raw error string
        print(f"  {PASS} Server returned non-JSON error (expected)")
        results["passed"] += 1
    except Exception as e:
        print(f"  {FAIL} Unknown discovery type raised exception: {e}")
        results["failed"] += 1

    # ============================================================
    # Summary
    # ============================================================
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    total = results["passed"] + results["failed"]
    print(f"  Passed: {results['passed']}/{total}")
    print(f"  Failed: {results['failed']}/{total}")

    if results["failed"] == 0:
        print(f"\n{PASS} All tests passed! KP-7 discovery features verified.")
        return 0
    else:
        print(f"\n{FAIL} Some tests failed. Review output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
