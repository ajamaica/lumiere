#!/usr/bin/env python3
"""
Example script: Set options for a download or globally.

Usage:
    python set-options.py --gid <GID> --max-download-limit <VALUE>
    python set-options.py --global --max-concurrent-downloads <VALUE>

This script demonstrates how to modify download options for a specific
task or change global aria2 options.
"""

import sys
import os
import argparse

# Add scripts directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from config_loader import Aria2Config
from rpc_client import Aria2RpcClient, Aria2RpcError


def parse_speed_limit(value):
    """Parse speed limit value (e.g., '1M', '500K', '1024' bytes)."""
    value = value.strip().upper()

    if value.endswith("K"):
        return str(int(value[:-1]) * 1024)
    elif value.endswith("M"):
        return str(int(value[:-1]) * 1024 * 1024)
    elif value.endswith("G"):
        return str(int(value[:-1]) * 1024 * 1024 * 1024)
    else:
        # Assume bytes
        return value


def main():
    """Set download or global options."""
    parser = argparse.ArgumentParser(
        description="Set aria2 options for a download or globally"
    )
    parser.add_argument(
        "--gid",
        type=str,
        help="GID of the download to modify (omit for global options)",
    )
    parser.add_argument(
        "--global",
        dest="is_global",
        action="store_true",
        help="Modify global options instead of a specific download",
    )
    parser.add_argument(
        "--max-download-limit",
        type=str,
        help="Max download speed (e.g., '1M', '500K', '0' for unlimited)",
    )
    parser.add_argument(
        "--max-upload-limit",
        type=str,
        help="Max upload speed (e.g., '100K', '0' for unlimited)",
    )
    parser.add_argument(
        "--max-concurrent-downloads",
        type=int,
        help="Max concurrent downloads (global option)",
    )
    parser.add_argument(
        "--max-connection-per-server", type=int, help="Max connections per server"
    )
    parser.add_argument(
        "--split", type=int, help="Number of connections for a single download"
    )

    args = parser.parse_args()

    # Build options dictionary
    options = {}

    if args.max_download_limit:
        options["max-download-limit"] = parse_speed_limit(args.max_download_limit)

    if args.max_upload_limit:
        options["max-upload-limit"] = parse_speed_limit(args.max_upload_limit)

    if args.max_concurrent_downloads:
        options["max-concurrent-downloads"] = str(args.max_concurrent_downloads)

    if args.max_connection_per_server:
        options["max-connection-per-server"] = str(args.max_connection_per_server)

    if args.split:
        options["split"] = str(args.split)

    if not options:
        print("✗ No options specified. Use --help for usage.")
        sys.exit(1)

    if not args.is_global and not args.gid:
        print("✗ Either --gid or --global must be specified")
        sys.exit(1)

    try:
        # Load configuration
        config_loader = Aria2Config()
        config = config_loader.load()

        print(f"Connecting to aria2 at {config_loader.get_endpoint_url()}...")

        # Create RPC client
        client = Aria2RpcClient(config)

        if args.is_global:
            # Set global options
            print(f"\nSetting global options:")
            for key, value in options.items():
                print(f"  {key}: {value}")

            result = client.change_global_option(options)

            if result == "OK":
                print("✓ Global options updated successfully")
            else:
                print(f"✓ Result: {result}")

            # Show updated global options
            print("\nUpdated global options:")
            global_opts = client.get_global_option()
            for key in options.keys():
                print(f"  {key}: {global_opts.get(key, 'N/A')}")

        else:
            # Set options for specific download
            print(f"\nSetting options for GID {args.gid}:")
            for key, value in options.items():
                print(f"  {key}: {value}")

            result = client.change_option(args.gid, options)

            if result == "OK":
                print(f"✓ Options updated successfully for GID {args.gid}")
            else:
                print(f"✓ Result: {result}")

            # Show updated options
            print(f"\nUpdated options for GID {args.gid}:")
            download_opts = client.get_option(args.gid)
            for key in options.keys():
                print(f"  {key}: {download_opts.get(key, 'N/A')}")

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
