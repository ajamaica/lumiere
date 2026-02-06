#!/usr/bin/env python3
"""
Example script: Pause all active downloads.

Usage:
    python pause-all.py

This script demonstrates how to pause all active downloads in aria2.
"""

import sys
import os

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config_loader import Aria2Config
from rpc_client import Aria2RpcClient, Aria2RpcError


def main():
    """Pause all active downloads."""
    try:
        # Load configuration
        config_loader = Aria2Config()
        config = config_loader.load()

        print(f"Connecting to aria2 at {config_loader.get_endpoint_url()}...")

        # Create RPC client
        client = Aria2RpcClient(config)

        # Get active downloads first to show what will be paused
        print("\nGetting list of active downloads...")
        active = client.tell_active()

        if not active:
            print("✓ No active downloads to pause")
            return

        print(f"Found {len(active)} active download(s):")
        for download in active:
            gid = download.get("gid", "unknown")
            status = download.get("status", "unknown")
            files = download.get("files", [])
            filename = files[0].get("path", "unknown") if files else "unknown"
            print(f"  - GID {gid}: {filename} (status: {status})")

        # Pause all downloads
        print(f"\nPausing all {len(active)} download(s)...")
        result = client.pause_all()

        if result == "OK":
            print("✓ All downloads paused successfully")
        else:
            print(f"✓ Pause result: {result}")

        # Verify by checking active downloads again
        print("\nVerifying...")
        active_after = client.tell_active()
        print(f"Active downloads after pause: {len(active_after)}")

    except Aria2RpcError as e:
        print(f"✗ aria2 error: {e}")
        print(f"  Code: {e.code}")
        print(f"  Message: {e.message}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
