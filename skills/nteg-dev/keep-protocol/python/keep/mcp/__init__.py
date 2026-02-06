"""keep-protocol MCP server for direct tool calling.

Exposes KeepClient functions as MCP tools for low-latency agent coordination.
"""

from keep.mcp.server import main, mcp

__all__ = ["main", "mcp"]
