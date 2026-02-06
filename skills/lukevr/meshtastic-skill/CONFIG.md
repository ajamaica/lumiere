# Meshtastic Skill Configuration

Edit these values for your setup. The skill reads this file for personalization.

## Node Identity

```yaml
node_name: 'YourNode'
node_short: 'YN'
node_id: '!abcd1234'
```

## Hardware

```yaml
serial_port: '/dev/ttyACM0'
hardware: 'RAK4631' # RAK4631, T-Beam, Heltec, LilyGo, etc.
region: 'EU_868' # EU_868, US_915, ANZ_915, etc.
modem: 'LONG_FAST' # LONG_FAST, MEDIUM_SLOW, SHORT_FAST, etc.
```

## MQTT Bridge

```yaml
# Receive global mesh traffic
mqtt_receive:
  broker: 'mqtt.meshtastic.org'
  port: 1883
  user: 'meshdev'
  pass: 'large4cats'
  topic: 'msh/EU_868/2/json/#'

# Publish to map (optional)
mqtt_publish:
  enabled: false
  broker: 'mqtt.meshtastic.es'
  port: 1883
  user: ''
  pass: ''
  topic: 'msh/EU_868/2/e/'
```

## Socket Server

```yaml
socket_host: '127.0.0.1'
socket_port: 7331
```

## Alert Destinations (optional)

```yaml
# Where to send alerts/digests
alerts:
  channel: 'telegram' # telegram, discord, signal, etc.
  target: '' # chat/channel ID
  thread_id: '' # topic/thread ID (if applicable)
```

## Privacy

```yaml
# Position fuzzing for map reports
position_fuzz_km: 2

# Your approximate location (for distance calculations)
home_lat: 0.0
home_lon: 0.0
```

## File Paths

```yaml
message_log: '/tmp/mesh_messages.txt'
nodes_cache: '/tmp/mesh_nodes.json'
monitor_state: '/tmp/mesh_monitor_state.json'
```

---

After editing, restart the bridge service:

```bash
sudo systemctl restart meshtastic-bridge
```
