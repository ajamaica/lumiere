#!/usr/bin/env python3
"""
Meshtastic MCP Server

MCP (Model Context Protocol) interface for Meshtastic mesh networks.
Provides both bridge-based messaging and direct device control.

Usage:
  python mcp_server.py                    # stdio mode (for MCP clients)
  python mcp_server.py --test             # test connections

Architecture:
  - Messaging: MCP → socket:7331 → mqtt_bridge.py → Meshtastic
  - Device ops: MCP → direct serial/TCP → Meshtastic device
"""

import asyncio
import json
import socket
import logging
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import Any, Optional

# MCP imports
try:
    from mcp.server import Server
    from mcp.types import Tool, TextContent
    from mcp.server.stdio import stdio_server
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False

# Meshtastic imports (for direct device access)
try:
    import meshtastic
    import meshtastic.serial_interface
    import meshtastic.tcp_interface
    MESHTASTIC_AVAILABLE = True
except ImportError:
    MESHTASTIC_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("meshtastic-mcp")

# Configuration
SOCKET_HOST = os.environ.get("MESH_SOCKET_HOST", "127.0.0.1")
SOCKET_PORT = int(os.environ.get("MESH_SOCKET_PORT", "7331"))
SOCKET_TIMEOUT = 5
MESSAGE_LOG = Path(os.environ.get("MESH_MESSAGE_LOG", "/tmp/mesh_messages.txt"))
SERIAL_PORT = os.environ.get("MESH_SERIAL_PORT", "/dev/ttyACM0")

# Global device interface (lazy initialized)
_device_interface = None


def get_device_interface():
    """Get or create direct Meshtastic device interface."""
    global _device_interface
    if _device_interface is None and MESHTASTIC_AVAILABLE:
        try:
            _device_interface = meshtastic.serial_interface.SerialInterface(SERIAL_PORT)
            logger.info(f"Connected to Meshtastic device on {SERIAL_PORT}")
        except Exception as e:
            logger.warning(f"Could not connect to device: {e}")
    return _device_interface


def close_device_interface():
    """Close device interface if open."""
    global _device_interface
    if _device_interface:
        try:
            _device_interface.close()
        except:
            pass
        _device_interface = None


# ═══════════════════════════════════════════════════════════════
# SOCKET API (for bridge-based messaging)
# ═══════════════════════════════════════════════════════════════

def socket_command(cmd: dict, timeout: float = SOCKET_TIMEOUT) -> dict:
    """Send command to mqtt_bridge via socket."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            sock.connect((SOCKET_HOST, SOCKET_PORT))
            sock.send(json.dumps(cmd).encode())
            response = sock.recv(8192).decode()
            return json.loads(response)
    except socket.timeout:
        return {"ok": False, "error": "Socket timeout - is mqtt_bridge.py running?"}
    except ConnectionRefusedError:
        return {"ok": False, "error": f"Connection refused on {SOCKET_HOST}:{SOCKET_PORT}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def read_messages(limit: int = 20, since_minutes: Optional[int] = None) -> list[dict]:
    """Read messages from log file."""
    messages = []
    if not MESSAGE_LOG.exists():
        return messages
    
    try:
        lines = MESSAGE_LOG.read_text().strip().split('\n')
        lines = [l for l in lines if l.strip()]
        
        for line in reversed(lines[-500:]):
            try:
                parts = line.split('|', 4)
                if len(parts) >= 5:
                    timestamp, channel, sender, distance, text = parts
                    
                    if since_minutes:
                        msg_time = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        age = (datetime.now() - msg_time.replace(tzinfo=None)).total_seconds() / 60
                        if age > since_minutes:
                            continue
                    
                    messages.append({
                        "timestamp": timestamp,
                        "channel": channel,
                        "sender": sender,
                        "distance": distance,
                        "text": text
                    })
                    
                    if len(messages) >= limit:
                        break
            except:
                continue
    except Exception as e:
        logger.error(f"Error reading messages: {e}")
    
    return list(reversed(messages))


def filter_noise(messages: list[dict]) -> list[dict]:
    """Filter out test/noise messages."""
    noise = ["hello!", "hello, world!", "hey!", "hey2", "mqtt-test", "test", "ping", "pong"]
    return [m for m in messages if m.get("text", "").lower().strip() not in noise]


# ═══════════════════════════════════════════════════════════════
# MCP SERVER
# ═══════════════════════════════════════════════════════════════

async def run_mcp_server():
    """Run the MCP server."""
    if not MCP_AVAILABLE:
        print("MCP library required. Install with: pip install mcp", file=sys.stderr)
        sys.exit(1)
    
    server = Server("meshtastic")
    
    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List available Meshtastic tools."""
        tools = [
            # === MESSAGING (via bridge) ===
            Tool(
                name="mesh_send",
                description="Send a text message to the mesh network",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Message text (max ~230 chars)"},
                        "to": {"type": "string", "description": "Destination node ID (e.g., !abcd1234) for DM, omit for broadcast"},
                        "channel": {"type": "integer", "description": "Channel index 0-7 (default: primary)"}
                    },
                    "required": ["text"]
                }
            ),
            Tool(
                name="mesh_messages",
                description="Get recent messages from the mesh network",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "description": "Max messages (default 20)", "default": 20},
                        "since_minutes": {"type": "integer", "description": "Only messages from last N minutes"},
                        "filter_noise": {"type": "boolean", "description": "Filter test messages (default true)", "default": True}
                    }
                }
            ),
            Tool(
                name="mesh_send_alert",
                description="Send a high-priority alert message to the mesh",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "text": {"type": "string", "description": "Alert message text"},
                        "to": {"type": "string", "description": "Destination node ID (optional)"}
                    },
                    "required": ["text"]
                }
            ),
            
            # === NETWORK INFO (via bridge) ===
            Tool(
                name="mesh_status",
                description="Check bridge and device connection status",
                inputSchema={"type": "object", "properties": {}}
            ),
            Tool(
                name="mesh_nodes",
                description="List all known nodes in the mesh network",
                inputSchema={"type": "object", "properties": {}}
            ),
            
            # === DEVICE INFO (direct) ===
            Tool(
                name="mesh_device_info",
                description="Get detailed info about the connected Meshtastic device",
                inputSchema={"type": "object", "properties": {}}
            ),
            Tool(
                name="mesh_channels",
                description="List configured channels on the device",
                inputSchema={"type": "object", "properties": {}}
            ),
            Tool(
                name="mesh_node_info",
                description="Get detailed info about a specific mesh node",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Node ID (e.g., !abcd1234)"}
                    },
                    "required": ["node_id"]
                }
            ),
            
            # === LOCATION (direct) ===
            Tool(
                name="mesh_send_position",
                description="Broadcast GPS position to the mesh (use approximate coords for privacy!)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "latitude": {"type": "number", "description": "Latitude in degrees"},
                        "longitude": {"type": "number", "description": "Longitude in degrees"},
                        "altitude": {"type": "integer", "description": "Altitude in meters (optional)"}
                    },
                    "required": ["latitude", "longitude"]
                }
            ),
            
            # === TELEMETRY (direct) ===
            Tool(
                name="mesh_request_telemetry",
                description="Request telemetry data from a node (battery, voltage, metrics)",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Target node ID (optional, broadcast if omitted)"}
                    }
                }
            ),
            
            # === TRACEROUTE (direct) ===
            Tool(
                name="mesh_traceroute",
                description="Send traceroute to discover path and signal quality to a node",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "node_id": {"type": "string", "description": "Target node ID"}
                    },
                    "required": ["node_id"]
                }
            ),
            
            # === DEVICE MANAGEMENT (direct) ===
            Tool(
                name="mesh_reboot",
                description="Reboot the connected Meshtastic device",
                inputSchema={"type": "object", "properties": {}}
            ),
        ]
        return tools
    
    @server.call_tool()
    async def call_tool(name: str, arguments: Any) -> list[TextContent]:
        """Handle tool calls."""
        try:
            # === MESSAGING (via bridge) ===
            if name == "mesh_send":
                text = arguments.get("text", "")
                if not text:
                    return [TextContent(type="text", text="Error: text is required")]
                
                cmd = {"cmd": "send", "text": text}
                if arguments.get("to"):
                    cmd["to"] = arguments["to"]
                if arguments.get("channel") is not None:
                    cmd["channel"] = arguments["channel"]
                
                result = socket_command(cmd)
                if result.get("ok"):
                    return [TextContent(type="text", text=f"✅ Sent to {arguments.get('to', 'broadcast')}: {text}")]
                return [TextContent(type="text", text=f"❌ Send failed: {result.get('error')}")]
            
            elif name == "mesh_send_alert":
                text = f"🚨 ALERT: {arguments.get('text', '')}"
                cmd = {"cmd": "send", "text": text, "priority": "high"}
                if arguments.get("to"):
                    cmd["to"] = arguments["to"]
                
                result = socket_command(cmd)
                if result.get("ok"):
                    return [TextContent(type="text", text=f"✅ Alert sent: {text}")]
                return [TextContent(type="text", text=f"❌ Alert failed: {result.get('error')}")]
            
            elif name == "mesh_messages":
                limit = arguments.get("limit", 20)
                since = arguments.get("since_minutes")
                do_filter = arguments.get("filter_noise", True)
                
                messages = read_messages(limit=limit * 2, since_minutes=since)
                if do_filter:
                    messages = filter_noise(messages)
                messages = messages[-limit:]
                
                if not messages:
                    return [TextContent(type="text", text="No messages found")]
                
                lines = [f"[{m['timestamp']}] {m['sender']} ({m['distance']}): {m['text']}" for m in messages]
                return [TextContent(type="text", text=f"📨 Recent messages ({len(messages)}):\n\n" + "\n".join(lines))]
            
            # === NETWORK INFO (via bridge) ===
            elif name == "mesh_status":
                result = socket_command({"cmd": "status"})
                if result.get("ok"):
                    return [TextContent(type="text", 
                        text=f"✅ Bridge connected\nSerial: {result.get('serial', 'unknown')}\nMessages: {result.get('messages', 0)}")]
                return [TextContent(type="text", text=f"❌ Bridge error: {result.get('error')}")]
            
            elif name == "mesh_nodes":
                result = socket_command({"cmd": "nodes"})
                if result.get("ok"):
                    nodes = result.get("nodes", [])
                    if not nodes:
                        return [TextContent(type="text", text="No nodes discovered yet")]
                    return [TextContent(type="text", text=f"📡 Mesh nodes ({len(nodes)}):\n" + "\n".join(f"  • {n}" for n in nodes))]
                return [TextContent(type="text", text=f"❌ Error: {result.get('error')}")]
            
            # === DEVICE INFO (direct) ===
            elif name == "mesh_device_info":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                try:
                    info = iface.getMyNodeInfo()
                    user = info.get('user', {})
                    pos = info.get('position', {})
                    device = info.get('deviceMetrics', {})
                    
                    text = f"""📻 Device Info:
  ID: {user.get('id', 'unknown')}
  Name: {user.get('longName', 'unknown')} ({user.get('shortName', '??')})
  Hardware: {user.get('hwModel', 'unknown')}
  Battery: {device.get('batteryLevel', '?')}%
  Voltage: {device.get('voltage', '?')}V
  Position: {pos.get('latitude', '?')}, {pos.get('longitude', '?')}"""
                    return [TextContent(type="text", text=text)]
                except Exception as e:
                    return [TextContent(type="text", text=f"❌ Error: {e}")]
            
            elif name == "mesh_channels":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                try:
                    channels = []
                    for i, ch in enumerate(iface.localNode.channels):
                        if ch.settings.name or i == 0:
                            role = str(ch.role).split('.')[-1]
                            name = ch.settings.name or "(primary)"
                            channels.append(f"  {i}: {name} [{role}]")
                    
                    return [TextContent(type="text", text=f"📻 Channels:\n" + "\n".join(channels))]
                except Exception as e:
                    return [TextContent(type="text", text=f"❌ Error: {e}")]
            
            elif name == "mesh_node_info":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                node_id = arguments.get("node_id", "")
                if node_id in iface.nodes:
                    node = iface.nodes[node_id]
                    user = node.get('user', {})
                    pos = node.get('position', {})
                    snr = node.get('snr', '?')
                    last = node.get('lastHeard', 0)
                    
                    text = f"""📡 Node {node_id}:
  Name: {user.get('longName', 'unknown')} ({user.get('shortName', '??')})
  Hardware: {user.get('hwModel', 'unknown')}
  SNR: {snr} dB
  Position: {pos.get('latitude', '?')}, {pos.get('longitude', '?')}
  Last heard: {datetime.fromtimestamp(last).isoformat() if last else 'never'}"""
                    return [TextContent(type="text", text=text)]
                return [TextContent(type="text", text=f"❌ Node {node_id} not found")]
            
            # === LOCATION (direct) ===
            elif name == "mesh_send_position":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                lat = arguments.get("latitude")
                lon = arguments.get("longitude")
                alt = arguments.get("altitude", 0)
                
                try:
                    iface.sendPosition(latitude=lat, longitude=lon, altitude=alt)
                    return [TextContent(type="text", text=f"✅ Position sent: {lat:.4f}, {lon:.4f}, {alt}m")]
                except Exception as e:
                    return [TextContent(type="text", text=f"❌ Error: {e}")]
            
            # === TELEMETRY (direct) ===
            elif name == "mesh_request_telemetry":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                try:
                    node_id = arguments.get("node_id")
                    # Request telemetry - results come async via pubsub
                    iface.sendTelemetry(destinationId=node_id)
                    return [TextContent(type="text", text=f"✅ Telemetry requested from {node_id or 'all nodes'}")]
                except Exception as e:
                    return [TextContent(type="text", text=f"❌ Error: {e}")]
            
            # === TRACEROUTE (direct) ===
            elif name == "mesh_traceroute":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                node_id = arguments.get("node_id")
                if not node_id:
                    return [TextContent(type="text", text="❌ node_id required")]
                
                try:
                    iface.sendTraceRoute(dest=node_id, hopLimit=8)
                    return [TextContent(type="text", text=f"✅ Traceroute sent to {node_id} (results arrive async)")]
                except Exception as e:
                    return [TextContent(type="text", text=f"❌ Error: {e}")]
            
            # === DEVICE MANAGEMENT (direct) ===
            elif name == "mesh_reboot":
                if not MESHTASTIC_AVAILABLE:
                    return [TextContent(type="text", text="❌ meshtastic library not installed")]
                
                iface = get_device_interface()
                if not iface:
                    return [TextContent(type="text", text="❌ Could not connect to device")]
                
                try:
                    iface.localNode.reboot()
                    close_device_interface()
                    return [TextContent(type="text", text="✅ Device rebooting...")]
                except Exception as e:
                    return [TextContent(type="text", text=f"❌ Error: {e}")]
            
            else:
                return [TextContent(type="text", text=f"Unknown tool: {name}")]
        
        except Exception as e:
            logger.error(f"Tool error: {e}")
            return [TextContent(type="text", text=f"Error: {str(e)}")]
    
    logger.info("Starting Meshtastic MCP server...")
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


# ═══════════════════════════════════════════════════════════════
# CLI
# ═══════════════════════════════════════════════════════════════

def test_connections():
    """Test socket and device connections."""
    print("=" * 50)
    print("Meshtastic MCP Server - Connection Test")
    print("=" * 50)
    
    # Test socket bridge
    print(f"\n1. Socket Bridge ({SOCKET_HOST}:{SOCKET_PORT}):")
    result = socket_command({"cmd": "status"})
    if result.get("ok"):
        print(f"   ✅ Connected")
        print(f"   Serial: {result.get('serial', 'unknown')}")
        print(f"   Messages: {result.get('messages', 0)}")
    else:
        print(f"   ❌ {result.get('error')}")
    
    # Test message log
    print(f"\n2. Message Log ({MESSAGE_LOG}):")
    if MESSAGE_LOG.exists():
        messages = read_messages(limit=5)
        print(f"   ✅ Found, {len(messages)} recent messages")
    else:
        print(f"   ⚠️ Not found (bridge may not have written yet)")
    
    # Test direct device
    print(f"\n3. Direct Device ({SERIAL_PORT}):")
    if not MESHTASTIC_AVAILABLE:
        print("   ⚠️ meshtastic library not installed (pip install meshtastic)")
    else:
        iface = get_device_interface()
        if iface:
            try:
                info = iface.getMyNodeInfo()
                user = info.get('user', {})
                print(f"   ✅ Connected")
                print(f"   Node: {user.get('longName', 'unknown')} ({user.get('id', '?')})")
            except Exception as e:
                print(f"   ❌ {e}")
        else:
            print(f"   ❌ Could not connect")
    
    print("\n" + "=" * 50)


if __name__ == "__main__":
    if "--test" in sys.argv:
        test_connections()
    elif not MCP_AVAILABLE:
        print("MCP library not installed. Install: pip install mcp")
        print("Test connections with: python mcp_server.py --test")
        sys.exit(1)
    else:
        asyncio.run(run_mcp_server())
