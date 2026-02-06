#!/usr/bin/env python3
"""
Example script: List all downloads (active, waiting, and stopped).

Usage:
    python list-downloads.py [--limit NUM]

This script demonstrates how to query and display all download tasks
across different states: active, waiting, and stopped.
"""

import sys
import os
import argparse

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config_loader import Aria2Config
from rpc_client import Aria2RpcClient, Aria2RpcError


def format_size(bytes_val):
    """Format bytes to human-readable size."""
    if not bytes_val or bytes_val == "0":
        return "0 B"

    bytes_int = int(bytes_val)
    units = ["B", "KB", "MB", "GB", "TB"]
    unit_index = 0

    while bytes_int >= 1024 and unit_index < len(units) - 1:
        bytes_int /= 1024.0
        unit_index += 1

    return f"{bytes_int:.2f} {units[unit_index]}"


def format_speed(speed_val):
    """Format download speed."""
    if not speed_val or speed_val == "0":
        return "0 B/s"
    return f"{format_size(speed_val)}/s"


def print_downloads(title, downloads):
    """Print formatted download list."""
    print(f"\n{title}:")
    print("=" * 80)

    if not downloads:
        print("  (none)")
        return

    for download in downloads:
        gid = download.get("gid", "unknown")
        status = download.get("status", "unknown")

        # Get file info
        files = download.get("files", [])
        if files:
            file_path = files[0].get("path", "unknown")
            filename = (
                os.path.basename(file_path) if file_path != "unknown" else "unknown"
            )
        else:
            filename = "unknown"

        # Get size info
        total_length = download.get("totalLength", "0")
        completed_length = download.get("completedLength", "0")

        # Calculate progress
        if total_length and total_length != "0":
            total_int = int(total_length)
            completed_int = int(completed_length)
            progress = (completed_int / total_int) * 100 if total_int > 0 else 0
        else:
            progress = 0

        # Get speed
        download_speed = download.get("downloadSpeed", "0")

        print(f"\nGID: {gid}")
        print(f"  Status: {status}")
        print(f"  File: {filename}")
        print(
            f"  Progress: {format_size(completed_length)} / {format_size(total_length)} ({progress:.1f}%)"
        )

        if status == "active":
            print(f"  Speed: {format_speed(download_speed)}")


def main():
    """List all downloads."""
    parser = argparse.ArgumentParser(description="List all aria2 downloads")
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of stopped downloads to show (default: 10)",
    )
    args = parser.parse_args()

    try:
        # Load configuration
        config_loader = Aria2Config()
        config = config_loader.load()

        print(f"Connecting to aria2 at {config_loader.get_endpoint_url()}...")

        # Create RPC client
        client = Aria2RpcClient(config)

        # Get active downloads
        active = client.tell_active()
        print_downloads(f"Active Downloads ({len(active)})", active)

        # Get waiting downloads
        waiting = client.tell_waiting(0, args.limit)
        print_downloads(f"Waiting Downloads ({len(waiting)})", waiting)

        # Get stopped downloads (completed, error, removed)
        stopped = client.tell_stopped(0, args.limit)
        print_downloads(
            f"Stopped Downloads ({len(stopped)}, showing up to {args.limit})", stopped
        )

        # Summary
        print("\n" + "=" * 80)
        print(
            f"Summary: {len(active)} active, {len(waiting)} waiting, {len(stopped)} stopped (limited)"
        )

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
