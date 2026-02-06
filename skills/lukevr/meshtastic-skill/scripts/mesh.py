#!/usr/bin/env python3
"""
Meshtastic CLI for OpenClaw
Provides send, info, nodes, and messages commands
"""

import sys
import argparse
import json
import socket
from datetime import datetime

# Configuration - edit these or use CONFIG.md
SERIAL_PORT = "/dev/ttyACM0"
MESSAGES_FILE = "/tmp/mesh_messages.txt"
SOCKET_HOST = "127.0.0.1"
SOCKET_PORT = 7331

def socket_cmd(req):
    """Send command to bridge via socket"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(10)
    sock.connect((SOCKET_HOST, SOCKET_PORT))
    sock.sendall(json.dumps(req).encode() + b'\n')
    response = sock.recv(4096).decode().strip()
    sock.close()
    return json.loads(response)

def cmd_send(args):
    """Send a text message via bridge socket"""
    req = {
        'cmd': 'send',
        'text': args.message,
        'channel': args.channel,
    }
    if args.to:
        req['to'] = args.to
    
    try:
        resp = socket_cmd(req)
        if resp.get('ok'):
            print(f"✓ Sent: {args.message}")
        else:
            print(f"✗ {resp.get('error', 'Unknown error')}", file=sys.stderr)
            sys.exit(1)
    except ConnectionRefusedError:
        print(f"Error: Bridge not running (port {SOCKET_PORT})", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def cmd_status(args):
    """Show bridge status"""
    try:
        resp = socket_cmd({'cmd': 'status'})
        if resp.get('ok'):
            print("Bridge Status:")
            print(f"  Map enabled: {'✅' if resp.get('map_enabled') else '❌'}")
            print(f"  Global MQTT: {'✅' if resp.get('global_mqtt') else '❌'}")
            print(f"  Map MQTT: {'✅' if resp.get('map_mqtt') else '❌'}")
            print(f"  Mesh connected: {'✅' if resp.get('mesh') else '❌'}")
            print(f"  Cached nodes: {resp.get('cached_nodes', 0)}")
        else:
            print(f"Error: {resp.get('error', 'Unknown')}", file=sys.stderr)
            sys.exit(1)
    except ConnectionRefusedError:
        print(f"Error: Bridge not running (port {SOCKET_PORT})", file=sys.stderr)
        sys.exit(1)

def cmd_nodes(args):
    """List nodes in mesh via bridge socket"""
    try:
        resp = socket_cmd({'cmd': 'nodes'})
        if resp.get('ok'):
            nodes = resp.get('nodes', [])
            if not nodes:
                print("No nodes discovered yet")
                return
            
            print(f"Found {len(nodes)} node(s):\n")
            for n in nodes:
                last_heard = n.get('lastHeard', 0)
                if last_heard:
                    ago = int((datetime.now().timestamp() - last_heard) / 60)
                    heard_str = f"{ago}m ago" if ago < 60 else f"{ago//60}h ago"
                else:
                    heard_str = "never"
                
                pos_str = ""
                if n.get('lat'):
                    pos_str = f"({n['lat']:.4f}, {n['lon']:.4f})"
                
                print(f"  {n['id']} - {n.get('name', '?')} ({n.get('short', '??')}) - heard {heard_str} {pos_str}")
        else:
            print(f"Error: {resp.get('error', 'Unknown')}", file=sys.stderr)
            sys.exit(1)
    except ConnectionRefusedError:
        print(f"Error: Bridge not running (port {SOCKET_PORT})", file=sys.stderr)
        sys.exit(1)

def cmd_messages(args):
    """Read recent messages from MQTT bridge log"""
    try:
        with open(MESSAGES_FILE, 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print("No messages file found (bridge may not be running)")
        return
    
    lines = lines[-args.limit:]
    
    if not lines:
        print("No messages yet")
        return
    
    print(f"Last {len(lines)} message(s):\n")
    for line in lines:
        parts = line.strip().split('|')
        if len(parts) >= 5:
            ts, channel, sender, dist, text = parts[0], parts[1], parts[2], parts[3], '|'.join(parts[4:])
            try:
                dt = datetime.fromisoformat(ts.split('.')[0])
                ts_str = dt.strftime("%H:%M")
            except:
                ts_str = ts[:5]
            print(f"  [{ts_str}] [{channel}] {sender} ({dist}): {text}")
        else:
            print(f"  {line.strip()}")

def cmd_map(args):
    """Toggle map visibility"""
    try:
        req = {'cmd': 'map'}
        if args.on:
            req['enable'] = True
        elif args.off:
            req['enable'] = False
        
        resp = socket_cmd(req)
        if resp.get('ok'):
            status = "enabled" if resp.get('map_enabled') else "disabled"
            print(f"✓ Map publishing {status}")
        else:
            print(f"✗ {resp.get('error', 'Unknown')}", file=sys.stderr)
            sys.exit(1)
    except ConnectionRefusedError:
        print(f"Error: Bridge not running (port {SOCKET_PORT})", file=sys.stderr)
        sys.exit(1)

def cmd_setup(args):
    """Interactive setup wizard"""
    import subprocess
    import os
    
    print("=" * 50)
    print("🛰️  Meshtastic Setup Wizard")
    print("=" * 50)
    print()
    
    # Step 1: Check USB device
    print("Step 1: Checking for USB device...")
    result = subprocess.run(['lsusb'], capture_output=True, text=True)
    usb_found = any(x in result.stdout for x in ['RAK', 'Meshtastic', 'Adafruit', 'ESP32', 'CP210', 'CH340'])
    if usb_found:
        print("  ✅ Meshtastic-compatible device detected")
        for line in result.stdout.split('\n'):
            if any(x in line for x in ['RAK', 'Meshtastic', 'Adafruit', 'ESP32', 'CP210', 'CH340']):
                print(f"     {line.strip()}")
    else:
        print("  ⚠️  No Meshtastic USB device found")
        print("     Connect your device and try again")
        if not args.force:
            return
    print()
    
    # Step 2: Check serial port
    print("Step 2: Checking serial port...")
    ports = []
    for p in ['/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyUSB0', '/dev/ttyUSB1']:
        if os.path.exists(p):
            ports.append(p)
    
    if ports:
        print(f"  ✅ Found serial port(s): {', '.join(ports)}")
        serial_port = ports[0]
    else:
        print("  ❌ No serial port found")
        if not args.force:
            return
        serial_port = SERIAL_PORT
    print()
    
    # Step 3: Check bridge socket
    print("Step 3: Testing bridge socket...")
    try:
        resp = socket_cmd({'cmd': 'status'})
        if resp.get('ok'):
            print(f"  ✅ Bridge responding on port {SOCKET_PORT}")
            print(f"     Mesh connected: {'✅' if resp.get('mesh') else '❌'}")
            print(f"     Cached nodes: {resp.get('cached_nodes', 0)}")
    except:
        print(f"  ⚠️  Bridge not responding on port {SOCKET_PORT}")
        print("     Start with: sudo systemctl start meshtastic-bridge")
    print()
    
    # Step 4: Check bridge service
    print("Step 4: Checking systemd service...")
    result = subprocess.run(
        ['systemctl', 'is-active', 'meshtastic-bridge.service'],
        capture_output=True, text=True
    )
    if result.stdout.strip() == 'active':
        print("  ✅ Bridge service running")
    else:
        print("  ⚠️  Bridge service not running")
        print("     Enable: sudo systemctl enable --now meshtastic-bridge")
    print()
    
    # Step 5: Check message log
    print("Step 5: Checking message log...")
    if os.path.exists(MESSAGES_FILE):
        with open(MESSAGES_FILE, 'r') as f:
            lines = f.readlines()
        print(f"  ✅ Message log exists ({len(lines)} messages)")
    else:
        print("  ⚠️  No message log yet")
    print()
    
    # Summary
    print("=" * 50)
    print("📋 Setup Summary")
    print("=" * 50)
    print(f"  Serial port: {serial_port}")
    print(f"  Bridge socket: {SOCKET_HOST}:{SOCKET_PORT}")
    print(f"  Message log: {MESSAGES_FILE}")
    print()
    print("Commands:")
    print("  mesh.py status    - Bridge status")
    print("  mesh.py nodes     - List mesh nodes")
    print("  mesh.py messages  - Recent messages")
    print("  mesh.py send 'Hi' - Send to mesh")
    print("  mesh.py map       - Toggle map visibility")

def main():
    parser = argparse.ArgumentParser(description="Meshtastic CLI for OpenClaw")
    subparsers = parser.add_subparsers(dest='command', required=True)
    
    # send
    p_send = subparsers.add_parser('send', help='Send a message')
    p_send.add_argument('message', help='Message text')
    p_send.add_argument('--channel', '-c', type=int, default=0, help='Channel index (0-7)')
    p_send.add_argument('--to', '-t', help='Destination node ID for DM')
    
    # status
    subparsers.add_parser('status', help='Show bridge status')
    
    # nodes
    subparsers.add_parser('nodes', help='List mesh nodes')
    
    # messages
    p_msgs = subparsers.add_parser('messages', help='Read recent messages')
    p_msgs.add_argument('--limit', '-l', type=int, default=20, help='Number of messages')
    
    # map
    p_map = subparsers.add_parser('map', help='Toggle map visibility')
    p_map.add_argument('--on', action='store_true', help='Enable map')
    p_map.add_argument('--off', action='store_true', help='Disable map')
    
    # setup
    p_setup = subparsers.add_parser('setup', help='Interactive setup wizard')
    p_setup.add_argument('--force', '-f', action='store_true', help='Continue even if checks fail')
    
    args = parser.parse_args()
    
    commands = {
        'send': cmd_send,
        'status': cmd_status,
        'nodes': cmd_nodes,
        'messages': cmd_messages,
        'map': cmd_map,
        'setup': cmd_setup,
    }
    
    try:
        commands[args.command](args)
    except KeyboardInterrupt:
        print("\nAborted")
        sys.exit(130)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
