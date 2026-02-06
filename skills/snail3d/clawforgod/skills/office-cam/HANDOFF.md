# ESP32-CAM HTTP Server Handoff

## Files Location

- **Firmware:** `~/clawd/skills/office-cam/firmware/src/main.cpp`
- **Arduino sketch:** `~/clawd/skills/office-cam/firmware/ClawdSense_HTTP_Camera.ino`
- **PlatformIO config:** `~/clawd/skills/office-cam/firmware/platformio.ini`

## Goal

Get the XIAO ESP32-S3 Sense with OV2640 camera working as an HTTP camera server that responds to `GET /capture` with a JPEG image.

## Current Status

- ✅ WiFi credentials updated (SpectrumSetup-617D / smoothcurrent945)
- ✅ Firmware compiles and flashes successfully
- ❌ Camera init fails with error 0x105 (ESP_ERR_NOT_FOUND)
- ❌ Device not responding on network (shows in ARP but no HTTP response)
- ❌ Serial output not readable (empty when trying to read)

## Hardware

- **Board:** Seeed Studio XIAO ESP32-S3 Sense
- **Camera:** OV2640 (built-in, ribbon connector)
- **Connection:** USB-C to Mac
- **Device path:** `/dev/cu.usbmodem21201`

## Issues to Debug

1. **Camera not detected** - Error 0x105 means camera probe failed
   - Camera module is seated firmly (user confirmed)
   - May need different pin definitions for this board revision
   - May need different camera config (frame size, fb_count, etc.)

2. **No serial output** - Can't see boot messages or WiFi status
   - Try different serial reading methods
   - Check baud rate
   - Try resetting the board while reading serial

3. **Not on network** - Device shows in ARP table at 192.168.1.16 but doesn't respond to HTTP or ping
   - Could be stuck in boot loop
   - Could be wrong WiFi password
   - Could be crashing before WiFi connects

## Working Example to Reference

The original ClawdSense firmware (Telegram-based) at:
`/Users/ericwoodard/Desktop/programs/clawd bot/ClawdSense/src/main.cpp`

This firmware works with the camera - study its `initCamera()` function for pin settings and config.

## Test Plan

1. First, get serial output working so we can see what's happening
2. Fix camera initialization (compare with working firmware)
3. Verify WiFi connects and get the IP address
4. Test HTTP endpoints (/capture, /status)
5. Update the capture-esp32.sh script with correct IP

## Success Criteria

```bash
curl http://192.168.1.XX/capture -o test.jpg
# Returns a valid JPEG image from the camera
```
