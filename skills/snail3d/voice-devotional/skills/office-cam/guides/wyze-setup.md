# Wyze Camera RTSP Setup

Stream video from **Wyze Cam v3** or **Wyze Cam Pan** over your local network using RTSP.

## Prerequisites

- Wyze camera (v3, Pan, or Pan v2)
- Wyze app + account
- Local WiFi network
- Custom firmware or RTSP enable

## Quick Start

### Option 1: Wyze RTSP Enable (Official)

Wyze added native RTSP support in recent firmware. To enable:

1. Open **Wyze App**
2. Tap your camera → **Settings** → **Advanced Settings**
3. Look for **RTSP** option
4. Enable RTSP
5. Note the **IP address** and **port**

### Option 2: OpenIPC Custom Firmware

For more features and control, use **OpenIPC** (open-source alternative):

**⚠️ Note:** This voids warranty and requires technical setup.

```bash
# Visit https://openipc.org
# Download firmware for your Wyze camera model
# Flash via USB-UART adapter (detailed guides on OpenIPC wiki)
```

## Configuration

### 1. Find Camera IP

```bash
# Scan your network
nmap -p 554 192.168.1.0/24

# Or check Wyze app for device IP
```

### 2. Set Environment Variable

```bash
export WYZE_IP="192.168.1.100"  # Replace with your IP
export WYZE_RTSP_PORT="554"     # Default RTSP port
```

### 3. Test Connection

```bash
# Test RTSP stream
ffprobe rtsp://$WYZE_IP:$WYZE_RTSP_PORT/live
```

## Capture from Wyze

### Using ffmpeg

```bash
# Single frame capture
ffmpeg -rtsp_transport tcp -i "rtsp://$WYZE_IP:554/live" -frames 1 -q:v 1 wyze_photo.jpg

# 10 second video clip
ffmpeg -rtsp_transport tcp -i "rtsp://$WYZE_IP:554/live" -t 10 wyze_clip.mp4
```

### Using the ClawCamera Script

```bash
# Capture from Wyze
./scripts/capture-wyze.sh

# Or specify IP
./scripts/capture-wyze.sh --ip 192.168.1.100
```

## Troubleshooting

### Camera Not Found

```bash
# Verify IP is correct
ping 192.168.1.100

# Check if RTSP port is open
nc -zv 192.168.1.100 554
```

### Connection Timeout

```bash
# Try UDP instead of TCP
ffmpeg -rtsp_transport udp -i "rtsp://$WYZE_IP:554/live" -frames 1 output.jpg
```

### Stream Stops

- Wyze cameras can have connection limits (usually 1-2 streams max)
- Increase timeout in ffmpeg: `-rtsp_transport tcp -read_timeout 10000000`
- Check Wyze app isn't actively using the camera

### Poor Quality/Lag

- Reduce resolution: Add `-s 1280x720` to ffmpeg command
- Lower frame rate: Add `-r 15` for 15 fps
- Check WiFi signal strength

## Advanced: Motion Detection via RTSP

Use ffmpeg motion detection on the stream:

```bash
# Detect motion continuously
ffmpeg -rtsp_transport tcp -i "rtsp://$WYZE_IP:554/live" \
  -vf "fps=1,select='isnan(prev_selected_t)+gte(t\-prev_selected_t\,1)',scale=320:-1" \
  -vsync vfr \
  -f image2 \
  motion_%04d.jpg
```

## Multi-Camera Setup

If you have multiple Wyze cameras:

```bash
# Capture from all cameras
for ip in 192.168.1.100 192.168.1.101 192.168.1.102; do
  ffmpeg -rtsp_transport tcp -i "rtsp://$ip:554/live" \
    -frames 1 "camera_${ip##*.}.jpg" \
    -loglevel quiet
done

# View results
ls camera_*.jpg
```

## Integration with Overwatch

Add to your monitoring script:

```bash
#!/bin/bash
# Monitor multiple Wyze cameras

CAMERAS=(
  "192.168.1.100"  # Front door
  "192.168.1.101"  # Backyard
  "192.168.1.102"  # Office
)

while true; do
  for camera in "${CAMERAS[@]}"; do
    ffmpeg -rtsp_transport tcp -i "rtsp://$camera:554/live" \
      -frames 1 -q:v 2 \
      "${HOME}/.clawdbot/overwatch/wyze_$(echo $camera | cut -d. -f4)_$(date +%s).jpg" \
      -loglevel quiet &
  done
  wait
  sleep 60  # Capture every minute
done
```

## Performance Tips

| Setting               | Impact      | Notes                                   |
| --------------------- | ----------- | --------------------------------------- |
| `-rtsp_transport tcp` | Reliable    | Slower but handles packet loss better   |
| `-rtsp_transport udp` | Fast        | May lose frames, use for live streaming |
| `-s 1280x720`         | Performance | Reduce from native 1920x1080            |
| `-r 15`               | CPU         | 15 fps instead of 30                    |
| `-c:v copy`           | Fast        | Copy codec, no re-encoding              |

## References

- [Wyze Official RTSP Docs](https://www.wyze.com)
- [OpenIPC Project](https://openipc.org)
- [FFmpeg RTSP Guide](https://trac.ffmpeg.org/wiki/Streaming)

---

**Next:** Integrate with [Overwatch monitoring](../README.md#overwatch-mode)
