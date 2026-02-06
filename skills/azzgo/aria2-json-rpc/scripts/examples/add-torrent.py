#!/usr/bin/env python3
"""
Example script: Add a torrent file to aria2.

Usage:
    python add-torrent.py <torrent-file> [--dir DIR] [--select-file INDEX]

This script demonstrates how to add a torrent file to aria2 with various options.
It shows:
- Loading a torrent file (automatically Base64 encoded)
- Setting download directory
- Selecting specific files from multi-file torrents
- Adding web seeds for additional download sources
- Monitoring the download progress

Requirements:
    - aria2 must be running with RPC enabled
    - Torrent file must exist at the specified path
"""

import sys
import os
import argparse
import time

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


def monitor_download(client, gid, duration=5):
    """Monitor download progress for a few seconds."""
    print(f"\nMonitoring download for {duration} seconds...")
    print("=" * 80)

    start_time = time.time()
    while time.time() - start_time < duration:
        try:
            status = client.tell_status(gid)
            state = status.get("status", "unknown")

            if state == "complete":
                print("\n✓ Download completed!")
                break
            elif state == "error":
                error_msg = status.get("errorMessage", "Unknown error")
                print(f"\n✗ Download error: {error_msg}")
                break
            elif state == "removed":
                print("\n✗ Download was removed")
                break

            # Get progress info
            completed = int(status.get("completedLength", "0"))
            total = int(status.get("totalLength", "0"))
            speed = status.get("downloadSpeed", "0")

            if total > 0:
                progress = (completed / total) * 100
                print(
                    f"\rProgress: {format_size(completed)} / {format_size(total)} "
                    f"({progress:.1f}%) - Speed: {format_speed(speed)}",
                    end="",
                    flush=True,
                )
            else:
                print(
                    f"\rDownloading metadata... Speed: {format_speed(speed)}",
                    end="",
                    flush=True,
                )

            time.sleep(1)
        except Aria2RpcError as e:
            if e.code == 1:  # GID not found - download might be complete
                print("\n✓ Download completed (GID not found)")
                break
            raise

    print()  # New line after progress


def main():
    """Add a torrent file to aria2."""
    parser = argparse.ArgumentParser(
        description="Add a torrent file to aria2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Add a torrent file
  python add-torrent.py ubuntu.torrent

  # Add torrent to specific directory
  python add-torrent.py ubuntu.torrent --dir /downloads/ubuntu

  # Add torrent and select only file at index 1
  python add-torrent.py distro.torrent --select-file 1

  # Add torrent with web seed mirror
  python add-torrent.py file.torrent --web-seed http://mirror.example.com/file.iso
        """,
    )
    parser.add_argument("torrent_file", help="Path to the torrent file")
    parser.add_argument("--dir", help="Download directory (default: aria2's default)")
    parser.add_argument(
        "--select-file",
        help="Select specific file index(es) from torrent (comma-separated)",
    )
    parser.add_argument(
        "--web-seed",
        action="append",
        help="Add web seed URL (can be specified multiple times)",
    )
    parser.add_argument(
        "--no-monitor", action="store_true", help="Don't monitor download progress"
    )
    args = parser.parse_args()

    # Validate torrent file exists
    if not os.path.isfile(args.torrent_file):
        print(f"✗ Error: Torrent file not found: {args.torrent_file}")
        sys.exit(1)

    try:
        # Load configuration
        config_loader = Aria2Config()
        config = config_loader.load()

        print(f"Connecting to aria2 at {config_loader.get_endpoint_url()}...")

        # Create RPC client
        client = Aria2RpcClient(config)

        # Prepare options
        options = {}
        if args.dir:
            options["dir"] = args.dir
            print(f"Download directory: {args.dir}")

        if args.select_file:
            options["select-file"] = args.select_file
            print(f"Selecting file(s): {args.select_file}")

        # Prepare web seeds
        web_seeds = args.web_seed if args.web_seed else []
        if web_seeds:
            print(f"Web seeds: {', '.join(web_seeds)}")

        # Add the torrent
        print(f"\nAdding torrent: {os.path.basename(args.torrent_file)}...")

        gid = client.add_torrent(
            torrent=args.torrent_file, uris=web_seeds, options=options
        )

        print(f"✓ Torrent added successfully!")
        print(f"  GID: {gid}")

        # Get initial status
        status = client.tell_status(gid)

        # Show torrent info
        files = status.get("files", [])
        if files:
            print(f"\nTorrent contains {len(files)} file(s):")
            for i, file_info in enumerate(files):
                file_path = file_info.get("path", "unknown")
                file_size = file_info.get("length", "0")
                selected = file_info.get("selected", "true")
                marker = "✓" if selected == "true" else "✗"
                print(
                    f"  {marker} [{i + 1}] {os.path.basename(file_path)} ({format_size(file_size)})"
                )

        # Monitor download unless disabled
        if not args.no_monitor:
            monitor_download(client, gid)
        else:
            print("\nUse 'python list-downloads.py' to check download progress")

    except Aria2RpcError as e:
        print(f"✗ aria2 error: {e}")
        print(f"  Code: {e.code}")
        print(f"  Message: {e.message}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
