#!/usr/bin/env python3
"""
Example script: Monitor downloads in real-time using WebSocket.

Usage:
    python monitor-downloads.py [--duration SECONDS]

This script demonstrates how to use aria2's WebSocket RPC interface
to monitor download progress in real-time. It shows:
- Connecting to aria2 via WebSocket
- Registering event handlers for download events
- Receiving real-time notifications about download progress
- Displaying download statistics as they update

Requirements:
    - aria2 must be running with RPC enabled (preferably WebSocket)
    - Python websockets library: `uv pip install websockets`

Note: If websockets is not available, the script will gracefully
      fall back to suggesting HTTP polling alternatives.
"""

import sys
import os
import asyncio
import argparse
import time

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config_loader import Aria2Config
from dependency_check import check_optional_websockets

# Check if websockets is available
if not check_optional_websockets():
    print("✗ Error: This example requires the 'websockets' library")
    print()
    print("Install it with:")
    print("  uv pip install websockets")
    print()
    print("Or use HTTP polling examples instead:")
    print("  python list-downloads.py")
    sys.exit(1)

from websocket_client import Aria2WebSocketClient
from rpc_client import Aria2RpcError


def format_size(bytes_val):
    """Format bytes to human-readable size."""
    if not bytes_val or bytes_val == "0":
        return "0 B"

    try:
        bytes_int = int(bytes_val)
    except (ValueError, TypeError):
        return "0 B"

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


class DownloadMonitor:
    """Monitor download events and display progress."""

    def __init__(self):
        self.downloads = {}  # GID -> download info
        self.start_time = time.time()
        self.event_count = 0

    async def on_download_start(self, event_data):
        """Handle download start event."""
        gid = event_data.get("gid")
        self.event_count += 1
        print(f"\n[{self.event_count}] ▶ Download started: {gid}")
        self.downloads[gid] = {"status": "active", "start_time": time.time()}

    async def on_download_pause(self, event_data):
        """Handle download pause event."""
        gid = event_data.get("gid")
        self.event_count += 1
        print(f"\n[{self.event_count}] ⏸ Download paused: {gid}")
        if gid in self.downloads:
            self.downloads[gid]["status"] = "paused"

    async def on_download_stop(self, event_data):
        """Handle download stop event."""
        gid = event_data.get("gid")
        self.event_count += 1
        print(f"\n[{self.event_count}] ⏹ Download stopped: {gid}")
        if gid in self.downloads:
            self.downloads[gid]["status"] = "stopped"

    async def on_download_complete(self, event_data):
        """Handle download complete event."""
        gid = event_data.get("gid")
        self.event_count += 1

        # Get final download info
        try:
            # We need to use HTTP client for this query since we're in an event handler
            # In a real application, you might maintain this state differently
            print(f"\n[{self.event_count}] ✓ Download completed: {gid}")

            if gid in self.downloads:
                elapsed = time.time() - self.downloads[gid].get(
                    "start_time", time.time()
                )
                print(f"  Time elapsed: {elapsed:.1f} seconds")
                self.downloads[gid]["status"] = "complete"
        except Exception as e:
            print(f"  (Could not fetch final status: {e})")

    async def on_download_error(self, event_data):
        """Handle download error event."""
        gid = event_data.get("gid")
        self.event_count += 1
        print(f"\n[{self.event_count}] ✗ Download error: {gid}")
        if gid in self.downloads:
            self.downloads[gid]["status"] = "error"

    async def on_bt_download_complete(self, event_data):
        """Handle BitTorrent download complete event."""
        gid = event_data.get("gid")
        self.event_count += 1
        print(f"\n[{self.event_count}] ✓ BitTorrent download completed: {gid}")
        if gid in self.downloads:
            self.downloads[gid]["status"] = "complete"

    def print_summary(self):
        """Print monitoring summary."""
        elapsed = time.time() - self.start_time
        print("\n" + "=" * 80)
        print(f"Monitoring Summary:")
        print(f"  Duration: {elapsed:.1f} seconds")
        print(f"  Events received: {self.event_count}")
        print(f"  Downloads tracked: {len(self.downloads)}")

        if self.downloads:
            status_counts = {}
            for dl in self.downloads.values():
                status = dl.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

            print(f"  Status breakdown:")
            for status, count in sorted(status_counts.items()):
                print(f"    {status}: {count}")


async def monitor_downloads(config, duration):
    """Monitor downloads using WebSocket connection."""
    monitor = DownloadMonitor()

    # Create WebSocket client
    client = Aria2WebSocketClient(config)

    # Register event handlers
    client.on("onDownloadStart", monitor.on_download_start)
    client.on("onDownloadPause", monitor.on_download_pause)
    client.on("onDownloadStop", monitor.on_download_stop)
    client.on("onDownloadComplete", monitor.on_download_complete)
    client.on("onDownloadError", monitor.on_download_error)
    client.on("onBtDownloadComplete", monitor.on_bt_download_complete)

    print("Connecting to aria2 WebSocket...")
    print(f"Will monitor for {duration} seconds (Ctrl+C to stop early)")
    print("=" * 80)

    try:
        # Connect to WebSocket
        await client.connect()
        print("✓ Connected to aria2 WebSocket")
        print("Listening for download events...\n")

        # Wait for the specified duration
        await asyncio.sleep(duration)

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback

        traceback.print_exc()
    finally:
        # Disconnect
        await client.disconnect()
        print("\n✓ Disconnected from aria2")

        # Print summary
        monitor.print_summary()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Monitor aria2 downloads in real-time via WebSocket",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Monitor downloads for 30 seconds
  python monitor-downloads.py

  # Monitor downloads for 5 minutes
  python monitor-downloads.py --duration 300

  # Monitor indefinitely (until Ctrl+C)
  python monitor-downloads.py --duration 999999

Events monitored:
  - onDownloadStart: New download started
  - onDownloadPause: Download paused
  - onDownloadStop: Download stopped
  - onDownloadComplete: Download completed
  - onDownloadError: Download encountered error
  - onBtDownloadComplete: BitTorrent download completed

Tips:
  - Start a download in another terminal while monitoring
  - Use 'python add-torrent.py' to test torrent download events
  - Use aria2c CLI to start downloads and watch events here
        """,
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=30,
        help="How long to monitor in seconds (default: 30)",
    )
    args = parser.parse_args()

    try:
        # Load configuration
        config_loader = Aria2Config()
        config = config_loader.load()

        # Check if WebSocket is configured
        if not config.get("websocket_url"):
            print("⚠ Warning: No WebSocket URL configured in config.json")
            print(
                "Using HTTP endpoint instead, but WebSocket is recommended for monitoring"
            )
            print()

        # Run the async monitor
        asyncio.run(monitor_downloads(config, args.duration))

    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
