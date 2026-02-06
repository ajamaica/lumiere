"""WebSocket client for communicating with the Claw Voice server."""

import argparse
import asyncio
import json
import shlex
import sys

import aiohttp


DEFAULT_URL = "ws://localhost:3111/connect"


async def run_agent(message: str) -> str:
    """Run openclaw agent and return its stdout."""
    cmd = f"openclaw agent --agent main --message {shlex.quote(message)}"
    proc = await asyncio.create_subprocess_shell(
        cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        return f"[agent error] {stderr.decode().strip()}"
    return stdout.decode().strip()


async def cmd_send(url: str, content: str) -> None:
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url) as ws:
            await ws.send_json({"type": "message", "content": content})
            resp = await ws.receive_json()
            print(json.dumps(resp))


async def cmd_recv(url: str, timeout: float) -> None:
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url) as ws:
            try:
                msg = await asyncio.wait_for(ws.receive_json(), timeout=timeout)
                print(json.dumps(msg))
            except asyncio.TimeoutError:
                print(json.dumps({"type": "error", "content": "timeout waiting for message"}))
                sys.exit(1)


async def cmd_listen(url: str, timeout: float) -> None:
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url) as ws:
            try:
                async with asyncio.timeout(timeout):
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            print(json.dumps(json.loads(msg.data)), flush=True)
                        elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                            break
            except TimeoutError:
                pass


async def cmd_agent(url: str, timeout: float) -> None:
    """Listen for user messages, forward each to openclaw agent, send the response back."""
    async with aiohttp.ClientSession() as session:
        async with session.ws_connect(url) as ws:
            try:
                async with asyncio.timeout(timeout):
                    async for msg in ws:
                        if msg.type == aiohttp.WSMsgType.TEXT:
                            data = json.loads(msg.data)
                            if data.get("type") != "message":
                                continue
                            user_text = data.get("content", "")
                            print(f"[user] {user_text}", flush=True)
                            reply = await run_agent(user_text)
                            print(f"[agent] {reply}", flush=True)
                            await ws.send_json({"type": "message", "content": reply})
                        elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                            break
            except TimeoutError:
                pass


def main() -> None:
    parser = argparse.ArgumentParser(description="Claw Voice WebSocket client")
    parser.add_argument("--url", default=DEFAULT_URL, help=f"WebSocket URL (default: {DEFAULT_URL})")
    sub = parser.add_subparsers(dest="command", required=True)

    p_send = sub.add_parser("send", help="Send a message and print the server response")
    p_send.add_argument("content", help="Message text to send")

    p_recv = sub.add_parser("recv", help="Wait for the next incoming message and print it")
    p_recv.add_argument("--timeout", type=float, default=30, help="Seconds to wait (default: 30)")

    p_listen = sub.add_parser("listen", help="Print incoming messages as JSON lines until timeout")
    p_listen.add_argument("--timeout", type=float, default=60, help="Seconds to listen (default: 60)")

    p_agent = sub.add_parser("agent", help="Listen for messages, forward to openclaw agent, send replies back")
    p_agent.add_argument("--timeout", type=float, default=0, help="Seconds to run (default: 0 = forever)")

    args = parser.parse_args()

    if args.command == "send":
        asyncio.run(cmd_send(args.url, args.content))
    elif args.command == "recv":
        asyncio.run(cmd_recv(args.url, args.timeout))
    elif args.command == "listen":
        asyncio.run(cmd_listen(args.url, args.timeout))
    elif args.command == "agent":
        timeout = args.timeout if args.timeout > 0 else float("inf")
        asyncio.run(cmd_agent(args.url, timeout))


if __name__ == "__main__":
    main()
