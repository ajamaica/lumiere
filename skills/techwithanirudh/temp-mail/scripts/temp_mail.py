#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["httpx", "rich"]
# ///
"""temp_mail: simple helper for Vortex hosted API"""

from __future__ import annotations
import argparse
import os
import secrets
import string
import sys
import time
import urllib.parse
import asyncio

from rich import print

VORTEX_URL = os.environ.get("VORTEX_URL", "https://vtx-api.skyfall.dev")
DEFAULT_DOMAIN = os.environ.get("VORTEX_DOMAIN", "skyfall.dev")


def rand_username(length: int = 8) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def make_address(domain: str | None = None, length: int = 8) -> str:
    domain = domain or DEFAULT_DOMAIN
    return f"{rand_username(length)}@{domain}"


async def fetch_messages_async(client, addr: str):
    url = f"{VORTEX_URL}/emails/{urllib.parse.quote(addr, safe='')}"
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; temp-mail/1.0)",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://vortex.skyfall.dev",
        "Referer": "https://vortex.skyfall.dev/",
    }
    r = await client.get(url, headers=headers, timeout=10)
    r.raise_for_status()
    return r.json()


async def clear_messages_async(client, addr: str):
    url = f"{VORTEX_URL}/emails/{urllib.parse.quote(addr, safe='')}/clear"
    headers = {"User-Agent": "temp-mail/1.0", "Origin": "https://vortex.skyfall.dev"}
    r = await client.delete(url, headers=headers, timeout=10)
    r.raise_for_status()
    return r.status_code


async def poll_for_messages_async(client, addr: str, timeout: int = 60, interval: int = 3):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            msgs = await fetch_messages_async(client, addr)
            if msgs:
                return msgs
        except Exception:
            # ignore transient errors, continue polling
            pass
        await asyncio.sleep(interval)
    return []


async def main_async(args):
    import httpx
    async with httpx.AsyncClient() as client:
        if args.cmd == "create":
            length = args.length or 8
            addr = make_address(args.domain, length)
            print(addr)
            return

        if args.cmd == "fetch":
            addr = args.address
            msgs = await fetch_messages_async(client, addr)
            print(msgs)
            return

        if args.cmd == "clear":
            addr = args.address
            code = await clear_messages_async(client, addr)
            print(code)
            return

        if args.cmd == "poll":
            addr = args.address
            msgs = await poll_for_messages_async(client, addr, timeout=args.timeout, interval=args.interval)
            print(msgs)
            return


def main():
    p = argparse.ArgumentParser(prog="temp_mail")
    sub = p.add_subparsers(dest="cmd")

    create = sub.add_parser("create")
    create.add_argument("--domain", "-d", default=None)
    create.add_argument("--length", "-l", type=int, default=8)

    fetch = sub.add_parser("fetch")
    fetch.add_argument("address")

    clear = sub.add_parser("clear")
    clear.add_argument("address")

    poll = sub.add_parser("poll")
    poll.add_argument("address")
    poll.add_argument("--timeout", "-t", type=int, default=60)
    poll.add_argument("--interval", "-i", type=int, default=3)

    args = p.parse_args()
    if not args.cmd:
        p.print_help()
        sys.exit(1)

    try:
        asyncio.run(main_async(args))
    except Exception as e:
        print("[red]error:[/red]", e)
        sys.exit(1)


if __name__ == '__main__':
    main()
