"""MCP server exposing keep-protocol tools.

Run with: python -m keep.mcp
Or after install: keep-mcp
"""

import json
import os
from typing import Optional

from mcp.server.fastmcp import FastMCP

from keep.client import KeepClient

# Configuration from environment
KEEP_HOST = os.environ.get("KEEP_HOST", "localhost")
KEEP_PORT = int(os.environ.get("KEEP_PORT", "9009"))
KEEP_SRC = os.environ.get("KEEP_SRC", "bot:mcp-agent")

# Create MCP server
mcp = FastMCP("keep-protocol")


def _get_client() -> KeepClient:
    """Create a KeepClient with configured host/port/src."""
    return KeepClient(host=KEEP_HOST, port=KEEP_PORT, src=KEEP_SRC)


@mcp.tool()
def keep_send(
    dst: str,
    body: str,
    fee: int = 0,
    ttl: int = 60,
    scar: str = "",
) -> str:
    """Send a signed packet to another AI agent via keep-protocol.

    Uses ed25519 signatures over TCP+Protobuf for authenticated,
    low-latency agent-to-agent communication.

    Args:
        dst: Destination agent or routing target (e.g., 'bot:weather', 'bot:planner', 'server')
        body: The message or intent to send
        fee: Micro-fee in sats for anti-spam (default: 0)
        ttl: Time-to-live in seconds (default: 60)
        scar: Optional scar/memory data to share (as string)

    Returns:
        Response body from the destination, or "done" if server acknowledged.
    """
    client = _get_client()
    scar_bytes = scar.encode("utf-8") if scar else b""

    try:
        reply = client.send(
            body=body,
            dst=dst,
            fee=fee,
            ttl=ttl,
            scar=scar_bytes,
        )
        return reply.body if reply else "sent"
    except ConnectionRefusedError:
        return f"error: keep-server not running on {KEEP_HOST}:{KEEP_PORT}"
    except Exception as e:
        return f"error: {str(e)}"


@mcp.tool()
def keep_discover(query: str = "info") -> str:
    """Discover keep-protocol server info and connected agents.

    Args:
        query: Discovery type - "info" for server version/uptime,
               "agents" for connected agent list, "stats" for scar exchange metrics.

    Returns:
        JSON string with discovery results.
    """
    client = _get_client()

    try:
        result = client.discover(query)
        return json.dumps(result, indent=2)
    except ConnectionRefusedError:
        return json.dumps({"error": f"keep-server not running on {KEEP_HOST}:{KEEP_PORT}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def keep_discover_agents() -> str:
    """List all currently connected agent identities.

    Returns:
        JSON array of agent identity strings (e.g., ["bot:alice", "bot:weather"]).
    """
    client = _get_client()

    try:
        agents = client.discover_agents()
        return json.dumps(agents)
    except ConnectionRefusedError:
        return json.dumps({"error": f"keep-server not running on {KEEP_HOST}:{KEEP_PORT}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def keep_listen(timeout: int = 10, register_src: Optional[str] = None) -> str:
    """Register this agent and listen for incoming messages.

    Opens a persistent connection, registers the agent identity, and listens
    for packets from other agents for the specified duration.

    Args:
        timeout: Seconds to listen before returning (default: 10)
        register_src: Optional custom identity to register (uses KEEP_SRC env if not set)

    Returns:
        JSON object with received messages: {"messages": [...], "count": N}
    """
    src = register_src or KEEP_SRC
    messages = []

    def on_message(packet):
        messages.append({
            "src": packet.src,
            "dst": packet.dst,
            "body": packet.body,
        })

    try:
        with KeepClient(host=KEEP_HOST, port=KEEP_PORT, src=src) as client:
            # Register with the server
            client.send(body="register", dst="server", wait_reply=True)
            # Listen for incoming packets
            client.listen(on_message, timeout=timeout)

        return json.dumps({"messages": messages, "count": len(messages)})
    except ConnectionRefusedError:
        return json.dumps({"error": f"keep-server not running on {KEEP_HOST}:{KEEP_PORT}"})
    except Exception as e:
        return json.dumps({"error": str(e)})


@mcp.tool()
def keep_ensure_server() -> str:
    """Ensure a keep-protocol server is running, starting one if needed.

    Checks if the server is reachable. If not, attempts to start one using:
    1. Docker (preferred): pulls and runs the multi-arch image
    2. Go fallback: installs and runs via `go install`

    Returns:
        JSON object: {"running": true/false, "method": "existing"|"docker"|"go"|"failed"}
    """
    # Check if already running
    if KeepClient._is_port_open(KEEP_HOST, KEEP_PORT):
        return json.dumps({"running": True, "method": "existing"})

    # Try to start
    success = KeepClient.ensure_server(host=KEEP_HOST, port=KEEP_PORT)

    if success:
        # Determine which method worked
        method = "docker" if KeepClient._has_docker() else "go"
        return json.dumps({"running": True, "method": method})
    else:
        return json.dumps({"running": False, "method": "failed"})


def main():
    """Entry point for keep-mcp command."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
