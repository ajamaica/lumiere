# Troubleshooting Guide

## Common Issues & Solutions

### 📸 Camera Issues

#### No images captured

```bash
# 1. List available video devices
ls /dev/video*

# 2. Check permissions
ls -l /dev/video0

# 3. Fix permissions if needed
sudo chmod 666 /dev/video0

# 4. Test ffmpeg directly
ffmpeg -f avfoundation -i "0" -frames 1 test.jpg
```

#### "Camera not found" error

- Plug in USB webcam
- Check it's detected: `system_profiler SPUSBDataType | grep -A 20 Camera`
- Try different USB port
- Check camera isn't used by another app (Photo Booth, etc.)

#### "Device or resource busy"

```bash
# Camera is in use elsewhere
# Find what's using it:
lsof | grep /dev/video

# Kill the process (e.g., Photo Booth)
killall "Photo Booth"
```

---

### 🎬 Motion Detection Issues

#### Motion detection too sensitive

```bash
# Increase threshold (reduce alerts)
./scripts/motion-detect.sh --threshold 15

# Or increase cooldown (fewer alerts per minute)
./scripts/motion-detect.sh --cooldown 300

# Or decrease check interval (samples less frequently)
MOTION_INTERVAL=5000 ./scripts/motion-detect.sh
```

#### Motion detection not triggering

```bash
# 1. Check motion is being detected
./scripts/motion-detect.sh --verbose

# 2. Verify capture is working
./scripts/capture.sh

# 3. Lower the threshold to test
./scripts/motion-detect.sh --threshold 1

# 4. Check file permissions
ls -la ~/.clawdbot/overwatch/
```

#### "Motion interval too low" error

- Minimum interval is 1000ms (1 second)
- Set reasonable value: `MOTION_INTERVAL=2000` (2 seconds)

---

### 👁️ Overwatch & Monitoring

#### Overwatch not running

```bash
# 1. Check if process is alive
./scripts/overwatch status

# 2. Check logs
tail -f ~/.clawdbot/overwatch/overwatch.log

# 3. Restart
./scripts/overwatch stop
./scripts/overwatch start

# 4. Check for errors
ps aux | grep overwatch
```

#### Overwatch consuming too much CPU

```bash
# Increase motion interval (check less frequently)
MOTION_INTERVAL=5000 ./scripts/overwatch start

# Or reduce image size/quality
CAPTURE_QUALITY=40 ./scripts/overwatch start
```

#### Random check-ins not arriving

```bash
# 1. Verify Telegram is configured
echo $TELEGRAM_TOKEN
echo $TELEGRAM_CHAT_ID

# 2. Check internet connection
ping 8.8.8.8

# 3. Verify gifgrep is installed
which gifgrep

# 4. Test GIF fetch manually
gifgrep "thumbs up" --max 1 --format url

# 5. Check check-in daemon
ps aux | grep checkin
```

---

### 🔐 API & Authentication

#### "GROQ_API_KEY not found"

```bash
# 1. Set API key
export GROQ_API_KEY=gsk_xxxxx

# 2. Verify it's set
echo $GROQ_API_KEY

# 3. Make it permanent
echo "export GROQ_API_KEY=gsk_xxxxx" >> ~/.zshrc
source ~/.zshrc
```

#### Groq API errors

```bash
# Rate limited
# → Wait a minute or reduce analysis frequency

# Invalid key
# → Regenerate key at https://console.groq.com

# Quota exceeded
# → Check usage at console.groq.com
# → Upgrade plan if needed
```

#### Telegram token invalid

```bash
# 1. Get new token from BotFather
# @BotFather on Telegram → /newbot

# 2. Set token
export TELEGRAM_TOKEN=your_new_token

# 3. Find chat ID
# Send message to bot, then:
curl https://api.telegram.org/bot$TELEGRAM_TOKEN/getUpdates

# 4. Set chat ID
export TELEGRAM_CHAT_ID=your_chat_id
```

---

### 📹 ESP32-CAM Issues

#### Firmware upload fails

```bash
# 1. Hold GPIO0 button BEFORE upload starts
# 2. Check COM port is correct
# 3. Try different USB cable
# 4. Try different USB port
# 5. Install CH340 drivers (USB adapter)
```

#### ESP32-CAM not connecting to WiFi

- Check SSID and password are correct
- Confirm 2.4GHz band is available (not 5GHz-only)
- Move closer to router
- Check router isn't blocking ESP32 MAC address

#### Images not uploading to receiver

```bash
# 1. Check receiver is running
lsof -i :5555

# 2. Verify IP address in firmware
# Edit the sketch and re-upload

# 3. Check firewall allows port 5555
# macOS: System Settings → Security & Privacy → Firewall

# 4. Ping ESP32
ping 192.168.1.50
```

#### Receiver crashing

```bash
# 1. Check Node.js version
node --version  # Should be 18+

# 2. Install dependencies
npm install

# 3. Run with logging
DEBUG=* node scripts/esp32-cam-receiver.js

# 4. Check disk space
df -h ~/.clawdbot/media/
```

---

### 🎬 Wyze Camera Issues

#### RTSP not available

- Check camera firmware is latest
- Some older Wyze cameras don't support RTSP
- Consider OpenIPC firmware (advanced)

#### Connection timeout

```bash
# Try UDP instead of TCP
ffmpeg -rtsp_transport udp -i "rtsp://$WYZE_IP:554/live" \
  -frames 1 output.jpg
```

#### Multiple streams cause conflicts

- Wyze cameras support ~1-2 simultaneous streams
- Don't have Wyze app AND ClawCamera capturing simultaneously
- Use connection pooling if multiple clients needed

#### Poor video quality

```bash
# Lower resolution for faster transfer
ffmpeg -rtsp_transport tcp -i "rtsp://$WYZE_IP:554/live" \
  -s 1280x720 -frames 1 output.jpg
```

---

### 🔄 BOLO (Be On Lookout) Issues

#### BOLO not matching

- Ensure **critical features** are visible in both images (moles, scars, plates)
- Try with simpler BOLO (e.g., just "blonde hair with glasses")
- Check lighting is similar between reference and query images

#### Too many false positives

- Make BOLO more strict (add more specific features)
- Use `--strict` flag for exact matching only
- Upload higher quality reference image

#### Feature extraction failing

```bash
# 1. Verify image is readable
file reference.jpg

# 2. Try with different image
# Reference image should be clear and well-lit

# 3. Check Groq API quota
# If many feature extractions, might hit rate limits
```

---

### 🌐 Network & Connectivity

#### "Connection refused" errors

```bash
# 1. Check service is listening
lsof -i :5555  # For receiver
lsof -i :3000  # For other services

# 2. Check firewall
sudo pfctl -s rules | grep 5555

# 3. Try localhost instead of IP
curl http://localhost:5555/health
```

#### DNS/hostname resolution

```bash
# Use IP address instead of hostname
# Bad: ffmpeg ... rtsp://wyze-cam.local/live
# Good: ffmpeg ... rtsp://192.168.1.100/live
```

#### Slow image transfer

- Check WiFi signal: `-15dBm` is ideal
- Move router closer
- Reduce image resolution
- Use 2.4GHz (more range) instead of 5GHz

---

### 💾 Storage & Cleanup

#### Disk space running out

```bash
# Check overwatch media size
du -sh ~/.clawdbot/overwatch/

# List largest files
ls -lhS ~/.clawdbot/overwatch/ | head -20

# Remove old images (older than 7 days)
find ~/.clawdbot/overwatch/ -type f -mtime +7 -delete

# Or run cleanup script
./scripts/cleanup.sh --days 7
```

#### Permission denied errors

```bash
# Fix directory permissions
chmod -R 755 ~/.clawdbot/overwatch/

# Fix file permissions
chmod -R 644 ~/.clawdbot/overwatch/*
```

---

### 🐛 Debug Mode

#### Enable verbose logging

```bash
# Motion detection
DEBUG=* ./scripts/motion-detect.sh --verbose

# Overwatch
DEBUG=* ./scripts/overwatch start

# Analyzer
DEBUG=* node scripts/analyzer.js
```

#### Check system resources

```bash
# CPU/Memory usage
top -o %CPU -o %MEM

# Disk I/O
iostat -w 1

# Network
netstat -an | grep ESTABLISHED
```

---

### 📊 Performance Diagnostics

```bash
# Time a capture operation
time ./scripts/capture.sh

# Profile Overwatch
NODE_ENV=production node --prof scripts/overwatch.js
node --prof-process isolate-*.log > profile.txt

# Check image processing speed
time ffmpeg -i photo.jpg -q:v 2 output.jpg
```

---

### 🆘 Still Stuck?

1. **Check logs:**

   ```bash
   tail -50 ~/.clawdbot/overwatch/overwatch.log
   tail -50 ~/.clawdbot/overwatch/analyzer.log
   ```

2. **Enable debug mode:**

   ```bash
   DEBUG=office-cam:* ./scripts/overwatch start
   ```

3. **Test components individually:**

   ```bash
   ./scripts/capture.sh          # Camera works?
   ./scripts/motion-detect.sh    # Motion detection works?
   node scripts/analyzer.js      # Analyzer works?
   ```

4. **Check environment:**

   ```bash
   printenv | grep -i groq
   printenv | grep -i telegram
   printenv | grep -i camera
   ```

5. **Open an issue** with:
   - Error message (full output)
   - `uname -a` (system info)
   - Relevant logs
   - Camera setup (USB/Wyze/ESP32)

---

**Need more help?** Open an issue on [GitHub](https://github.com/Snail3D/ClawCamera/issues)
