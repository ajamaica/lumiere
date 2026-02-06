#!/usr/bin/env python3
"""
Find Dirigera hub IP address.

Modes:
- Without token: scan subnet for likely candidates (port 8443 open).
- With token: verify by authenticating against candidates.
- Optional: try generate-token against candidates (interactive).

Usage:
  python scripts/find_dirigera_ip.py
  python scripts/find_dirigera_ip.py --subnet 192.168.1.0/24
  python scripts/find_dirigera_ip.py --token <TOKEN>
  python scripts/find_dirigera_ip.py --token <TOKEN> --subnet 192.168.1.0/24
  python scripts/find_dirigera_ip.py --try-generate-token
"""
import argparse
import ipaddress
import socket
import subprocess
import sys
from typing import Iterable, List, Optional, Tuple

import dirigera


def _local_ip() -> Optional[str]:
    """Get local IP by opening a UDP socket."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def _arp_ips() -> List[str]:
    """Best-effort ARP table parse."""
    try:
        result = subprocess.run(
            ["arp", "-a"],
            check=False,
            capture_output=True,
            text=True,
        )
    except Exception:
        return []

    ips: List[str] = []
    for line in result.stdout.splitlines():
        # Common formats: "? (192.168.1.10) at ..." or "192.168.1.10 ..."
        if "(" in line and ")" in line:
            start = line.find("(") + 1
            end = line.find(")")
            candidate = line[start:end].strip()
        else:
            candidate = line.split(" ")[0].strip()
        try:
            ipaddress.ip_address(candidate)
            ips.append(candidate)
        except ValueError:
            continue
    return ips


def _iter_subnet_ips(subnet: str) -> Iterable[str]:
    net = ipaddress.ip_network(subnet, strict=False)
    for ip in net.hosts():
        yield str(ip)


def _can_connect(hub: dirigera.Hub) -> bool:
    """Try to perform a lightweight call to verify connection."""
    try:
        if hasattr(hub, "get_hub_info"):
            hub.get_hub_info()
        else:
            # Fallback to a simple read
            hub.get_scenes()
        return True
    except Exception:
        return False


def _port_open(ip: str, port: int, timeout: float) -> bool:
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def find_dirigera_ip(
    token: Optional[str],
    subnet: Optional[str],
    port: int,
    timeout: float,
) -> Tuple[Optional[str], List[str]]:
    local_ip = _local_ip()
    if subnet is None:
        if not local_ip:
            raise RuntimeError("Could not determine local IP. Provide --subnet.")
        subnet = f"{local_ip}/24"

    arp_list = _arp_ips()
    candidates = []

    # Prefer ARP entries first
    for ip in arp_list:
        if ip not in candidates:
            candidates.append(ip)

    # Then scan the subnet
    for ip in _iter_subnet_ips(subnet):
        if ip == local_ip:
            continue
        if ip not in candidates:
            candidates.append(ip)

    open_port_candidates: List[str] = []

    for ip in candidates:
        if _port_open(ip, port, timeout):
            open_port_candidates.append(ip)

    if not token:
        return None, open_port_candidates

    for ip in open_port_candidates:
        try:
            hub = dirigera.Hub(token=token, ip_address=ip)
            if _can_connect(hub):
                return ip, open_port_candidates
        except Exception:
            continue

    return None, open_port_candidates


def try_generate_token(candidates: List[str]) -> None:
    print(
        "\nNote: This will prompt you to press the hub button for each candidate IP."
    )
    for ip in candidates:
        print(f"\nTrying generate-token against {ip} ...")
        print("When prompted, press the action button on the Dirigera hub, then hit ENTER.")
        try:
            subprocess.run(
                ["generate-token", ip],
                check=False,
            )
        except FileNotFoundError:
            print("Error: generate-token not found. Install dirigera with pip.")
            return


def main() -> int:
    parser = argparse.ArgumentParser(description="Find Dirigera hub IP address.")
    parser.add_argument("--token", help="Dirigera API token (optional)")
    parser.add_argument(
        "--subnet",
        help="Subnet to scan in CIDR notation (default: auto-detect /24)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8443,
        help="Port to probe for Dirigera (default: 8443)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=0.35,
        help="TCP connect timeout in seconds (default: 0.35)",
    )
    parser.add_argument(
        "--try-generate-token",
        action="store_true",
        help="Attempt generate-token against candidate IPs (interactive)",
    )
    args = parser.parse_args()

    try:
        ip, candidates = find_dirigera_ip(
            token=args.token,
            subnet=args.subnet,
            port=args.port,
            timeout=args.timeout,
        )
    except RuntimeError as exc:
        print(f"Error: {exc}")
        return 2

    if ip:
        print(f"Found Dirigera hub at: {ip}")
        return 0

    if candidates:
        print("Possible Dirigera IP candidates (port open):")
        for candidate in candidates:
            print(f"  - {candidate}")
        if args.token:
            print("\nToken verification failed for candidates above.")
        else:
            print("\nRun generate-token against a candidate IP, or re-run with --token to verify.")
        if args.try_generate_token:
            try_generate_token(candidates)
        return 0

    print("No candidates found. Try specifying --subnet explicitly.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
