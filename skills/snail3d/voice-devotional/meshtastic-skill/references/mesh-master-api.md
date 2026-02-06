# Mesh Master API Reference

This documents the HTTP API endpoints used by the Meshtastic skill to communicate with Mesh Master.

## Base URL

```
http://{RPi_IP}:5000
```

Example: `http://192.168.1.100:5000`

## Authentication

Mesh Master endpoints are protected by session auth (username/password). The skill handles this internally if needed.

## Endpoints

### Device Info

**GET** `/api/device/info`

Returns device information.

**Response:**

```json
{
  "long_name": "Snail",
  "short_name": "SN",
  "node_id": "!ba4bf9d0",
  "firmware_version": "2.5.1",
  "hardware_model": "T-Beam",
  "location": {...}
}
```

### Node List

**GET** `/api/nodes`

Returns all known nodes on the mesh.

**Response:**

```json
{
  "nodes": [
    {
      "num": 123456,
      "short_name": "Bob",
      "long_name": "Bob Smith",
      "rssi": -95,
      "snr": 5.5,
      "battery_level": 85,
      "latitude": 40.7128,
      "longitude": -74.006,
      "altitude": 10,
      "last_seen": 1643283600
    }
  ]
}
```

### Node Details

**GET** `/api/node/{node_id}`

Get details for a specific node.

**Parameters:**

- `node_id`: Node short name (e.g., "bob") or long ID (e.g., "!ba4bf9d0")

### Send Message

**POST** `/api/send`

Send a text message to a node or broadcast.

**Request:**

```json
{
  "destination": "bob",
  "text": "Hello there",
  "channel_index": 0
}
```

**Response:**

```json
{
  "success": true,
  "packet_id": 12345,
  "ack_received": true,
  "timestamp": 1643283600
}
```

### Channels

**GET** `/api/channels`

List all configured channels.

**Response:**

```json
{
  "channels": [
    {
      "index": 0,
      "name": "LongFast",
      "enabled": true,
      "psk": "default",
      "id": 0,
      "role": "PRIMARY"
    }
  ]
}
```

### Set Channel

**POST** `/api/channel/set`

Configure a channel parameter.

**Request:**

```json
{
  "channel_index": 0,
  "setting": "name",
  "value": "Hiking Group"
}
```

**Supported settings:**

- `name` - Channel name (string)
- `psk` - Pre-shared key (string or `random`, `default`, `none`)
- `downlink_enabled` - Enable downlink (boolean)
- `uplink_enabled` - Enable uplink (boolean)
- `module_settings` - Module configuration (varies)

### Radio Config

**GET** `/api/radio/config`

Get all radio/device settings.

**Response includes:**

- `lora` - LoRa settings (region, channel, bandwidth, etc.)
- `device` - Device settings (role, serial number, etc.)
- `position` - Position settings
- `power` - Power management
- `network` - Network settings (WiFi, MQTT)
- `security` - Encryption settings

### Set Radio Config

**POST** `/api/radio/set`

Set a configuration value.

**Request:**

```json
{
  "config_path": "lora.region",
  "value": "US"
}
```

**Common paths:**

- `lora.region` - LoRa region (US, EU, etc.)
- `lora.channel_num` - Channel number (0-255)
- `device.role` - Device role (CLIENT, ROUTER, ROUTER_CLIENT, REPEATER, TRACKER_ROLE)
- `device.node_expiration` - Node expiration time
- `power.wait_bluetooth_secs` - Bluetooth timeout
- `position.gps_enabled` - Enable GPS
- `network.wifi_enabled` - Enable WiFi
- `network.wifi_ssid` - WiFi SSID
- `network.wifi_psk` - WiFi password
- `security.private_key` - Private encryption key

### Set Device Owner

**POST** `/api/device/owner`

Set device name and short name.

**Request:**

```json
{
  "long_name": "John Smith",
  "short_name": "JS"
}
```

### Request Telemetry

**POST** `/api/telemetry/request`

Request telemetry (battery, signal, etc.) from a node.

**Request:**

```json
{
  "node_id": "bob"
}
```

**Response (async):**
Telemetry data will be added to node info when received.

### Request Position

**POST** `/api/position/request`

Request GPS position from a node.

**Request:**

```json
{
  "node_id": "bob"
}
```

### Get QR Code

**GET** `/api/qr?channel=0`

Get shareable QR code and URL for a channel.

**Query params:**

- `channel` - Channel index (0-7)

**Response:**

```json
{
  "url": "https://meshtastic.org/c/...",
  "qr_code_base64": "data:image/png;base64,..."
}
```

### Export Config

**GET** `/api/config/export`

Export full device configuration as YAML.

**Response:**

```yaml
device:
  long_name: Snail
  short_name: SN
  role: CLIENT
...
channels:
  - name: LongFast
    enabled: true
...
```

### Import Config

**POST** `/api/config/import`

Import configuration from YAML file.

**Request:**

```yaml
device:
  long_name: Snail
...
```

## Error Responses

All errors return standard format:

```json
{
  "success": false,
  "error": "Error message here",
  "code": 400
}
```

**Common error codes:**

- `400` - Bad request (invalid parameters)
- `404` - Not found (node, channel, etc.)
- `500` - Server error (device not connected)

## Rate Limiting

None enforced, but:

- Device has 3-second minimum between channel writes
- Commands may timeout if mesh is busy
- Too many simultaneous requests may queue internally

## Timeouts

Default timeouts in Mesh Master:

- Message send: 3-20 seconds (depends on mesh)
- Configuration: 5-10 seconds
- Telemetry request: 10-30 seconds
- Device reboot: 30 seconds

Skill uses 10-second default, configurable via `MESH_TIMEOUT` env var.

## Examples

### Send Broadcast Message

```bash
curl -X POST http://192.168.1.100:5000/api/send \
  -H "Content-Type: application/json" \
  -d '{"destination": "^all", "text": "Hello mesh!", "channel_index": 0}'
```

### List All Nodes

```bash
curl http://192.168.1.100:5000/api/nodes
```

### Set Channel Name

```bash
curl -X POST http://192.168.1.100:5000/api/channel/set \
  -H "Content-Type: application/json" \
  -d '{"channel_index": 0, "setting": "name", "value": "Hiking"}'
```

### Get Radio Config

```bash
curl http://192.168.1.100:5000/api/radio/config
```

### Set LoRa Region

```bash
curl -X POST http://192.168.1.100:5000/api/radio/set \
  -H "Content-Type: application/json" \
  -d '{"config_path": "lora.region", "value": "US"}'
```
