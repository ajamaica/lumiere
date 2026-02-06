#!/usr/bin/env python3
"""MCP tool adapter for keep-protocol.

Defines MCP tool schemas and handler functions that wrap KeepClient.
Copy these definitions into your MCP server to expose keep-protocol
as tools for AI agents.

No MCP framework dependency — uses only KeepClient and stdlib.
"""

import json
import sys
import os

# Add parent directory so we can import keep
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

from keep.client import KeepClient


# -- Tool Definitions --

KEEP_SEND_TOOL = {
    "name": "keep_send",
    "description": (
        "Send a signed packet to another AI agent via keep-protocol. "
        "Uses ed25519 signatures over TCP+Protobuf for authenticated, "
        "low-latency agent-to-agent communication."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "dst": {
                "type": "string",
                "description": (
                    "Destination agent or routing target. Examples: "
                    "'bot:weather', 'bot:planner', 'server'"
                ),
            },
            "body": {
                "type": "string",
                "description": "The message or intent to send",
            },
            "fee": {
                "type": "integer",
                "description": "Micro-fee in sats for anti-spam (default: 0)",
                "default": 0,
            },
        },
        "required": ["dst", "body"],
    },
}

KEEP_DISCOVER_TOOL = {
    "name": "keep_discover",
    "description": (
        "Discover keep-protocol server info and connected agents. "
        "Use query='info' for server version/uptime, 'agents' for "
        "connected agent list, 'stats' for scar exchange metrics."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "enum": ["info", "agents", "stats"],
                "description": "Discovery query type",
                "default": "info",
            },
        },
    },
}

KEEP_LISTEN_TOOL = {
    "name": "keep_listen",
    "description": (
        "Register this agent on the keep-protocol server and listen "
        "for incoming messages from other agents for a specified duration."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "timeout": {
                "type": "number",
                "description": "Seconds to listen before returning (default: 10)",
                "default": 10,
            },
        },
    },
}

ALL_TOOLS = [KEEP_SEND_TOOL, KEEP_DISCOVER_TOOL, KEEP_LISTEN_TOOL]


# -- Handler Functions --

def handle_keep_send(
    params: dict,
    host: str = "localhost",
    port: int = 9009,
    src: str = "bot:mcp-agent",
) -> dict:
    """Handle a keep_send tool call."""
    client = KeepClient(host, port, src=src)
    reply = client.send(
        body=params["body"],
        dst=params["dst"],
        fee=params.get("fee", 0),
    )
    return {
        "src": reply.src if reply else "",
        "body": reply.body if reply else "",
    }


def handle_keep_discover(
    params: dict,
    host: str = "localhost",
    port: int = 9009,
    src: str = "bot:mcp-agent",
) -> dict:
    """Handle a keep_discover tool call."""
    client = KeepClient(host, port, src=src)
    query = params.get("query", "info")
    return client.discover(query)


def handle_keep_listen(
    params: dict,
    host: str = "localhost",
    port: int = 9009,
    src: str = "bot:mcp-agent",
) -> dict:
    """Handle a keep_listen tool call."""
    timeout = params.get("timeout", 10)
    messages = []

    def on_message(p):
        messages.append({"src": p.src, "body": p.body})

    with KeepClient(host=host, port=port, src=src) as client:
        client.send(body="register", dst="server", wait_reply=True)
        client.listen(on_message, timeout=timeout)

    return {"messages": messages, "count": len(messages)}


HANDLERS = {
    "keep_send": handle_keep_send,
    "keep_discover": handle_keep_discover,
    "keep_listen": handle_keep_listen,
}


if __name__ == "__main__":
    print("keep-protocol MCP Tool Definitions")
    print("=" * 40)
    for tool in ALL_TOOLS:
        print(f"\n{tool['name']}:")
        print(json.dumps(tool, indent=2))
