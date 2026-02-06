#!/usr/bin/env python3
"""Example: How to expose keep-protocol as an MCP tool for AI agents.

This shows the tool definition schema that an MCP server could use to let
Claude, ChatGPT, Copilot, or other AI agents send signed packets via tool calls.
"""

KEEP_SEND_TOOL = {
    "name": "keep_send",
    "description": (
        "Send a signed packet to another AI agent via the keep protocol. "
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
                    "'bot:weather', 'nearest:planner', 'swarm:research'"
                ),
            },
            "body": {
                "type": "string",
                "description": "The message or intent to send to the target agent",
            },
            "fee": {
                "type": "integer",
                "description": "Micro-fee in sats for anti-spam priority (default: 0)",
                "default": 0,
            },
        },
        "required": ["dst", "body"],
    },
}


if __name__ == "__main__":
    import json
    print(json.dumps(KEEP_SEND_TOOL, indent=2))
