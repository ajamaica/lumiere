#!/usr/bin/env python3
"""
Bitaxe Gamma Monitor - Fetch status from Bitaxe API
Usage: python3 bitaxe_status.py [ip_address] [--format {json,text}] [--set-ip IP]

IP resolution order:
1. Command line argument
2. BITAXE_IP environment variable
3. Prompt for IP (if none of the above)

Use --set-ip to save IP to your shell profile (~/.bashrc or ~/.zshrc)
"""

import sys
import json
import urllib.request
import urllib.error
import argparse
import os
import subprocess


def get_shell_profile() -> str | None:
    """Get the user's shell profile file path."""
    home = os.path.expanduser("~")
    shell = os.environ.get("SHELL", "/bin/bash")
    
    if "zsh" in shell:
        return os.path.join(home, ".zshrc")
    elif "bash" in shell:
        bash_profile = os.path.join(home, ".bash_profile")
        bashrc = os.path.join(home, ".bashrc")
        # Prefer .bash_profile if it exists, otherwise .bashrc
        return bash_profile if os.path.exists(bash_profile) else bashrc
    else:
        # Default to .profile
        return os.path.join(home, ".profile")


def get_saved_ip() -> str | None:
    """Get IP from environment variable."""
    return os.environ.get("BITAXE_IP")


def set_ip_in_profile(ip: str) -> None:
    """Add export statement to shell profile for persistence."""
    profile = get_shell_profile()
    if not profile:
        raise RuntimeError("Could not determine shell profile file")
    
    export_line = f'export BITAXE_IP="{ip}"'
    
    # Check if BITAXE_IP is already set in profile
    existing_line = None
    if os.path.exists(profile):
        with open(profile, 'r') as f:
            for line in f:
                if 'BITAXE_IP=' in line:
                    existing_line = line.strip()
                    break
    
    if existing_line:
        # Replace existing line
        with open(profile, 'r') as f:
            content = f.read()
        content = content.replace(existing_line, export_line)
        with open(profile, 'w') as f:
            f.write(content)
        print(f"📝 Updated BITAXE_IP in {profile}")
    else:
        # Append new line
        with open(profile, 'a') as f:
            f.write(f"\n# Bitaxe Gamma Monitor\n{export_line}\n")
        print(f"📝 Added BITAXE_IP to {profile}")
    
    print(f"⚠️  Run 'source {profile}' or restart your terminal to apply changes")


def fetch_bitaxe_status(ip: str) -> dict:
    """Fetch system info from Bitaxe Gamma API."""
    url = f"http://{ip}/api/system/info"
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.URLError as e:
        raise ConnectionError(f"Failed to connect to Bitaxe at {ip}: {e}")
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response: {e}")


def format_text(data: dict) -> str:
    """Format status data as human-readable text."""
    lines = [
        "═" * 40,
        "   📊 BITAXE GAMMA STATUS",
        "═" * 40,
        "",
        f"⚡ Power:       {data.get('power', 'N/A'):.2f} W",
        f"🌡️  Temperature:  {data.get('temp', 'N/A'):.1f}°C (ASIC)",
        f"🌡️  VR Temp:      {data.get('vrTemp', 'N/A'):.1f}°C" if data.get('vrTemp') != -1 else "",
        f"💨 Fan Speed:   {data.get('fanspeed', 'N/A'):.1f}% ({data.get('fanrpm', 'N/A')} RPM)",
        f"",
        f"⛏️  Hashrate:     {data.get('hashRate', 'N/A'):.2f} GH/s",
        f"⛏️  Hashrate 1m:  {data.get('hashRate_1m', 'N/A'):.2f} GH/s",
        f"⛏️  Hashrate 10m: {data.get('hashRate_10m', 'N/A'):.2f} GH/s",
        f"",
        f"🎯 Best Diff:    {data.get('bestDiff', 'N/A'):,}",
        f"🎯 Best Session: {data.get('bestSessionDiff', 'N/A'):,}",
        f"",
        f"✅ Shares Accepted:  {data.get('sharesAccepted', 'N/A')}",
        f"❌ Shares Rejected:  {data.get('sharesRejected', 'N/A')}",
        f"",
        f"🌐 WiFi: {data.get('wifiStatus', 'N/A')} (RSSI: {data.get('wifiRSSI', 'N/A')} dBm)",
        f"🔗 Pool: {data.get('stratumURL', 'N/A')}:{data.get('stratumPort', 'N/A')}",
        f"🔄 Uptime: {data.get('uptimeSeconds', 0) // 3600}h {(data.get('uptimeSeconds', 0) % 3600) // 60}m",
        f"",
        f"📋 Version: {data.get('version', 'N/A')} | Board: {data.get('boardVersion', 'N/A')}",
        f"🔧 ASIC: {data.get('ASICModel', 'N/A')} @ {data.get('frequency', 'N/A')} MHz",
        "═" * 40,
    ]
    return "\n".join(line for line in lines if line)


def main():
    parser = argparse.ArgumentParser(
        description="Bitaxe Gamma Status Monitor",
        epilog="IP resolution: 1) Command argument 2) BITAXE_IP env var"
    )
    parser.add_argument("ip", nargs="?", help="Bitaxe IP address (optional if BITAXE_IP is set)")
    parser.add_argument("--format", choices=["json", "text"], default="text",
                        help="Output format (default: text)")
    parser.add_argument("--set-ip", metavar="IP",
                        help="Save IP to shell profile as BITAXE_IP environment variable")
    args = parser.parse_args()

    # Handle --set-ip first
    if args.set_ip:
        set_ip_in_profile(args.set_ip)
        return

    # Determine which IP to use (priority: arg > env var)
    ip = args.ip
    if not ip:
        ip = get_saved_ip()
        if not ip:
            parser.error(
                "No IP provided. Either:\n"
                "  - Pass IP as argument: bitaxe_status.py <IP>\n"
                "  - Set BITAXE_IP environment variable\n"
                "  - Save IP permanently: bitaxe_status.py --set-ip <IP>"
            )
        print(f"📡 Using BITAXE_IP from environment: {ip}\n")

    # Fetch and display status
    try:
        data = fetch_bitaxe_status(ip)
        if args.format == "json":
            print(json.dumps(data, indent=2))
        else:
            print(format_text(data))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
