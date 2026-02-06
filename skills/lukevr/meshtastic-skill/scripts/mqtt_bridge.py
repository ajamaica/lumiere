#!/usr/bin/env python3
"""
Meshtastic MQTT Bridge v2
- Receives global traffic from mqtt.meshtastic.org (JSON)
- Publishes map reports to mqtt.meshtastic.es (protobuf)
- Map visibility toggle via socket command
- Socket API on port 7331
"""

import meshtastic
import meshtastic.serial_interface
from pubsub import pub
import paho.mqtt.client as mqtt
import json
import time
import logging
import math
import socket
import threading
from datetime import datetime

# ═══════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════

SERIAL_PORT = "/dev/ttyACM0"
SEND_PORT = 7331

# Global MQTT (receive traffic)
MQTT_GLOBAL_BROKER = "mqtt.meshtastic.org"
MQTT_GLOBAL_PORT = 1883
MQTT_GLOBAL_USER = "meshdev"
MQTT_GLOBAL_PASS = "large4cats"
MQTT_GLOBAL_ROOT = "msh/EU_868/2/json"

# Spanish Map MQTT (publish position)
MQTT_MAP_BROKER = "mqtt.meshtastic.es"
MQTT_MAP_PORT = 1883
MQTT_MAP_USER = "meshdev"
MQTT_MAP_PASS = "large4cats"

# My location (set your coordinates)
MY_LAT = 0.0  # Set your latitude
MY_LON = 0.0  # Set your longitude

# State
MAP_ENABLED = True  # Toggle via socket command

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
log = logging.getLogger("bridge")

mesh_interface = None
mqtt_global = None  # For receiving global traffic
mqtt_map = None     # For publishing to Spanish map
node_positions = {}

# ═══════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in km"""
    R = 6371
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def get_distance_str(node_id):
    """Get distance string for a node"""
    if node_id in node_positions:
        pos = node_positions[node_id]
        dist = haversine_distance(MY_LAT, MY_LON, pos['lat'], pos['lon'])
        if dist < 1:
            return f"{dist*1000:.0f}m"
        elif dist < 100:
            return f"{dist:.1f}km"
        return f"{dist:.0f}km"
    return "?"

# ═══════════════════════════════════════════════════════════════
# MESH HANDLERS
# ═══════════════════════════════════════════════════════════════

def on_mesh_receive(packet, interface):
    """Handle incoming mesh messages"""
    try:
        decoded = packet.get('decoded', {})
        text = decoded.get('text', '')
        sender = packet.get('fromId', 'unknown')
        
        if text:
            log.info(f"📻 RF [{sender}]: {text}")
            # Log to messages file
            with open('/tmp/mesh_messages.txt', 'a') as f:
                f.write(f"{datetime.utcnow().isoformat()}|RF|{sender}|local|{text}\n")
    except Exception as e:
        log.error(f"Mesh receive error: {e}")

# ═══════════════════════════════════════════════════════════════
# GLOBAL MQTT (receive traffic)
# ═══════════════════════════════════════════════════════════════

def on_global_connect(client, userdata, flags, rc, props=None):
    if rc == 0:
        log.info(f"✓ Global MQTT connected ({MQTT_GLOBAL_BROKER})")
        client.subscribe([(f"{MQTT_GLOBAL_ROOT}/#", 0)])
        log.info(f"✓ Subscribed to {MQTT_GLOBAL_ROOT}/#")
    else:
        log.error(f"Global MQTT failed: {rc}")

def on_global_message(client, userdata, msg):
    """Handle incoming global MQTT messages"""
    global node_positions
    try:
        topic = msg.topic
        payload = msg.payload.decode('utf-8', errors='ignore')
        
        # Skip our own messages
        if "!YOUR_NODE_ID" in topic:
            return
        
        try:
            data = json.loads(payload)
        except:
            return
        
        sender = data.get('sender', data.get('from', 'unknown'))
        if isinstance(sender, int):
            sender = f"!{sender:08x}"
        
        # Track positions
        payload_data = data.get('payload', {})
        if isinstance(payload_data, dict):
            lat_i = payload_data.get('latitude_i')
            lon_i = payload_data.get('longitude_i')
            if lat_i and lon_i:
                lat, lon = lat_i / 1e7, lon_i / 1e7
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    node_positions[sender] = {
                        'lat': lat, 'lon': lon,
                        'last_seen': time.time()
                    }
        
        # Extract text messages
        text = None
        if isinstance(payload_data, dict) and 'text' in payload_data:
            text = payload_data.get('text')
        elif data.get('type') == 'sendtext':
            text = data.get('payload')
            if isinstance(text, dict):
                text = text.get('text')
        
        # Log text messages
        if text and isinstance(text, str) and len(text) > 1:
            channel = topic.split('/')[-2] if '/' in topic else 'unknown'
            dist = get_distance_str(sender)
            log.info(f"💬 [{channel}] {sender} ({dist}): {text}")
            
            with open('/tmp/mesh_messages.txt', 'a') as f:
                f.write(f"{datetime.utcnow().isoformat()}|{channel}|{sender}|{dist}|{text}\n")
            
            # Save node cache periodically
            if len(node_positions) % 10 == 0:
                try:
                    with open('/tmp/mesh_nodes.json', 'w') as f:
                        json.dump(node_positions, f)
                except:
                    pass
                    
    except Exception as e:
        log.error(f"Global MQTT error: {e}")

# ═══════════════════════════════════════════════════════════════
# MAP MQTT (publish to Spanish map)
# ═══════════════════════════════════════════════════════════════

def on_map_connect(client, userdata, flags, rc, props=None):
    if rc == 0:
        log.info(f"✓ Map MQTT connected ({MQTT_MAP_BROKER})")
    else:
        log.error(f"Map MQTT failed: {rc}")

def publish_map_report():
    """Publish position to Spanish map (protobuf format)"""
    global mesh_interface, mqtt_map, MAP_ENABLED
    
    if not MAP_ENABLED:
        log.info("📍 Map report skipped (disabled)")
        return
    
    if not mesh_interface or not mqtt_map:
        log.warning("Map report skipped: no connection")
        return
    
    try:
        from meshtastic.protobuf import mqtt_pb2, mesh_pb2, portnums_pb2
        
        my_node = mesh_interface.getMyNodeInfo()
        if not my_node:
            return
        
        pos = my_node.get('position', {})
        lat, lon = pos.get('latitude'), pos.get('longitude')
        
        if not lat or not lon:
            log.info("Map report skipped: no GPS fix")
            return
        
        my_info = mesh_interface.myInfo
        metadata = mesh_interface.metadata
        user = my_node.get('user', {})
        node_num = my_info.my_node_num
        
        # Fuzzy position (~2km)
        lat_fuzzy = round(lat * 50) / 50
        lon_fuzzy = round(lon * 50) / 50
        
        # Create MapReport protobuf
        map_report = mqtt_pb2.MapReport()
        map_report.long_name = user.get('longName', 'Unknown')
        map_report.short_name = user.get('shortName', '??')
        map_report.latitude_i = int(lat_fuzzy * 1e7)
        map_report.longitude_i = int(lon_fuzzy * 1e7)
        map_report.altitude = int(pos.get('altitude', 0))
        map_report.hw_model = mesh_pb2.HardwareModel.RAK4631
        map_report.firmware_version = metadata.firmware_version if metadata else "unknown"
        map_report.num_online_local_nodes = 1
        
        # Create ServiceEnvelope
        envelope = mqtt_pb2.ServiceEnvelope()
        envelope.packet.id = int(time.time()) & 0xFFFFFFFF
        setattr(envelope.packet, 'from', node_num)
        envelope.packet.to = 0xFFFFFFFF
        envelope.packet.decoded.portnum = portnums_pb2.PortNum.MAP_REPORT_APP
        envelope.packet.decoded.payload = map_report.SerializeToString()
        envelope.channel_id = "LongFast"
        envelope.gateway_id = f"!{node_num:08x}"
        
        mqtt_map.publish("msh/EU_868/2/map/", envelope.SerializeToString(), retain=False)
        log.info(f"📍 Map report: {lat_fuzzy:.2f}, {lon_fuzzy:.2f}")
        
    except Exception as e:
        log.error(f"Map report error: {e}")
        import traceback
        traceback.print_exc()

# ═══════════════════════════════════════════════════════════════
# SOCKET API (port 7331)
# ═══════════════════════════════════════════════════════════════

def handle_socket_client(conn, addr):
    """Handle socket commands"""
    global MAP_ENABLED
    try:
        data = conn.recv(4096).decode().strip()
        if not data:
            return
        
        cmd = json.loads(data)
        action = cmd.get('cmd', '')
        response = {"ok": False, "error": "unknown command"}
        
        if action == 'send':
            # Send message via mesh
            text = cmd.get('text', '')
            if text and mesh_interface:
                mesh_interface.sendText(text)
                log.info(f"📤 Sent: {text}")
                response = {"ok": True, "sent": text}
            else:
                response = {"ok": False, "error": "no text or no mesh"}
        
        elif action == 'nodes':
            # List known nodes
            nodes = []
            if mesh_interface:
                for node in mesh_interface.nodes.values():
                    user = node.get('user', {})
                    nodes.append({
                        'id': user.get('id', '?'),
                        'name': user.get('longName', 'Unknown'),
                        'short': user.get('shortName', '??'),
                        'lastHeard': node.get('lastHeard', 0)
                    })
            response = {"ok": True, "nodes": nodes}
        
        elif action == 'status':
            # Get status
            response = {
                "ok": True,
                "map_enabled": MAP_ENABLED,
                "global_mqtt": mqtt_global.is_connected() if mqtt_global else False,
                "map_mqtt": mqtt_map.is_connected() if mqtt_map else False,
                "mesh": mesh_interface is not None,
                "cached_nodes": len(node_positions)
            }
        
        elif action == 'map':
            # Toggle or set map visibility
            enable = cmd.get('enable')
            if enable is None:
                MAP_ENABLED = not MAP_ENABLED
            else:
                MAP_ENABLED = bool(enable)
            log.info(f"📍 Map reporting: {'ON' if MAP_ENABLED else 'OFF'}")
            response = {"ok": True, "map_enabled": MAP_ENABLED}
        
        elif action == 'map_now':
            # Force immediate map report
            publish_map_report()
            response = {"ok": True, "map_enabled": MAP_ENABLED}
        
        conn.send(json.dumps(response).encode())
        
    except Exception as e:
        log.error(f"Socket error: {e}")
        try:
            conn.send(json.dumps({"ok": False, "error": str(e)}).encode())
        except:
            pass
    finally:
        conn.close()

def socket_server():
    """Run socket API server"""
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(('127.0.0.1', SEND_PORT))
    server.listen(5)
    log.info(f"✓ Socket API on port {SEND_PORT}")
    
    while True:
        try:
            conn, addr = server.accept()
            threading.Thread(target=handle_socket_client, args=(conn, addr), daemon=True).start()
        except Exception as e:
            log.error(f"Socket server error: {e}")

def map_reporter():
    """Periodic map reports"""
    time.sleep(60)
    log.info("Map reporter: first report...")
    publish_map_report()
    while True:
        time.sleep(300)  # Every 5 min
        publish_map_report()

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    global mesh_interface, mqtt_global, mqtt_map, node_positions
    
    log.info("=" * 50)
    log.info("Meshtastic MQTT Bridge v2")
    log.info(f"  Global: {MQTT_GLOBAL_BROKER} (receive)")
    log.info(f"  Map:    {MQTT_MAP_BROKER} (publish)")
    log.info("=" * 50)
    
    # Load cached positions
    try:
        with open('/tmp/mesh_nodes.json', 'r') as f:
            node_positions = json.load(f)
        log.info(f"Loaded {len(node_positions)} cached positions")
    except:
        pass
    
    # Connect to mesh
    log.info(f"Connecting to mesh: {SERIAL_PORT}")
    mesh_interface = meshtastic.serial_interface.SerialInterface(devPath=SERIAL_PORT)
    pub.subscribe(on_mesh_receive, "meshtastic.receive")
    log.info("✓ Mesh connected")
    
    # Start socket API
    threading.Thread(target=socket_server, daemon=True).start()
    
    # Connect to global MQTT (receive)
    mqtt_global = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_global.username_pw_set(MQTT_GLOBAL_USER, MQTT_GLOBAL_PASS)
    mqtt_global.on_connect = on_global_connect
    mqtt_global.on_message = on_global_message
    mqtt_global.connect(MQTT_GLOBAL_BROKER, MQTT_GLOBAL_PORT, 60)
    mqtt_global.loop_start()
    
    # Connect to map MQTT (publish)
    mqtt_map = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_map.username_pw_set(MQTT_MAP_USER, MQTT_MAP_PASS)
    mqtt_map.on_connect = on_map_connect
    mqtt_map.connect(MQTT_MAP_BROKER, MQTT_MAP_PORT, 60)
    mqtt_map.loop_start()
    
    # Start map reporter
    threading.Thread(target=map_reporter, daemon=True).start()
    log.info("✓ Map reporter enabled (every 5 min)")
    
    log.info("")
    log.info("🌉 Bridge v2 running!")
    log.info("")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log.info("Shutting down...")
    finally:
        if mqtt_global:
            mqtt_global.loop_stop()
            mqtt_global.disconnect()
        if mqtt_map:
            mqtt_map.loop_stop()
            mqtt_map.disconnect()
        if mesh_interface:
            mesh_interface.close()

if __name__ == "__main__":
    main()
