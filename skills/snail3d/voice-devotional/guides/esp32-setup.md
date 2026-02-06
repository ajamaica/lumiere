# ESP32-CAM Setup Guide

Deploy an **OV2640 camera module** on an **ESP32-CAM** board for wireless office/home monitoring.

## Hardware

- **ESP32-CAM** (with OV2640 sensor)
- **USB-to-UART adapter** (CH340 or similar) or USB-C if available
- **micro-USB cable** for power
- **WiFi network** (2.4GHz, WPA2 recommended)

## Firmware Upload

### 1. Install Arduino IDE & Board Support

```bash
# Install Arduino IDE (if not already)
brew install arduino-ide

# Or download: https://www.arduino.cc/software
```

### 2. Add ESP32 Board to Arduino

1. Open Arduino IDE → Preferences
2. Under "Additional Board Manager URLs", add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Go to Tools → Board Manager
4. Search for "ESP32" and install by Espressif Systems
5. Select Board: **AI Thinker ESP32-CAM**

### 3. Configure Sketch Settings

```
Tools → Board: AI Thinker ESP32-CAM
Tools → Port: /dev/ttyUSB0 (or whatever port appears)
Tools → Upload Speed: 115200
Tools → Flash Frequency: 80 MHz
Tools → Flash Mode: DIO
Tools → Partition Scheme: Huge APP (3MB No OTA)
```

### 4. Upload Firmware

Create a new sketch with this code:

```cpp
#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>

// WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Server endpoint (where to send images)
const char* serverName = "http://YOUR_IP:5555/inbound/photo";

// Camera config for OV2640
camera_config_t config;

void setupCamera() {
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d7 = 17;
  config.pin_d6 = 18;
  config.pin_d5 = 19;
  config.pin_d4 = 20;
  config.pin_d3 = 21;
  config.pin_d2 = 22;
  config.pin_d1 = 23;
  config.pin_d0 = 25;
  config.pin_vsync = 27;
  config.pin_href = 26;
  config.pin_pclk = 13;
  config.pin_pwdn = 32;
  config.pin_reset = 15;
  config.xclk_freq_hz = 20000000;
  config.frame_size = FRAMESIZE_UXGA;  // 1600x1200
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  config.fb_location = CAMERA_FB_IN_DRAM;
  config.jpeg_quality = 12;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
}

void setupWiFi() {
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed");
  }
}

void captureAndSend() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }

  Serial.println("Sending image to server...");

  WiFiClient client;
  if (!client.connect("YOUR_IP", 5555)) {
    Serial.println("Connection to server failed");
    esp_camera_fb_return(fb);
    return;
  }

  // Send HTTP POST request
  String boundary = "BOUNDARY123456";
  String body = "--" + boundary + "\r\n";
  body += "Content-Disposition: form-data; name=\"file\"; filename=\"image.jpg\"\r\n";
  body += "Content-Type: image/jpeg\r\n\r\n";

  client.print("POST /inbound/photo HTTP/1.1\r\n");
  client.print("Host: YOUR_IP:5555\r\n");
  client.print("Content-Type: multipart/form-data; boundary=" + boundary + "\r\n");
  client.print("Content-Length: " + String(body.length() + fb->len + 50) + "\r\n");
  client.print("\r\n");

  client.print(body);
  client.write(fb->buf, fb->len);
  client.print("\r\n--" + boundary + "--\r\n");

  Serial.println("Image sent");
  esp_camera_fb_return(fb);
  client.stop();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\nESP32-CAM Initializing...");

  setupCamera();
  setupWiFi();

  Serial.println("Ready for capture");
}

void loop() {
  // Capture and send every 5 seconds
  if (WiFi.status() == WL_CONNECTED) {
    captureAndSend();
  }
  delay(5000);
}
```

**Important:** Replace:

- `YOUR_SSID` — Your WiFi network name
- `YOUR_PASSWORD` — Your WiFi password
- `YOUR_IP` — Your computer's IP (e.g., 192.168.1.100)

### 5. Upload

1. Connect ESP32-CAM via USB adapter
2. Hold **GPIO0 button** while uploading (press before upload starts)
3. Release button once upload begins
4. Check Serial Monitor for output

## Receiver Server

The firmware sends images to `http://YOUR_IP:5555/inbound/photo` via POST. You need a receiver running:

```bash
# Start the media receiver
node scripts/esp32-cam-receiver.js
```

This creates `~/.clawdbot/media/inbound/` and listens for multipart image uploads.

## Analyzer

Once receiver is running, start the analyzer to process images:

```bash
# Continuously monitor for new images and analyze
node scripts/analyzer.js
```

## Testing

### 1. Check IP Assignment

```bash
# Find ESP32-CAM on network
arp-scan -l | grep -i esp
# Or
nmap -p 80 192.168.1.0/24
```

### 2. View Camera Stream (Optional)

```bash
# Access http://192.168.1.50 in your browser (if rtspvideo installed)
# Or check serial monitor for boot messages
```

### 3. Verify Image Upload

```bash
# Monitor receiver logs
tail -f ~/.clawdbot/media/inbound/receiver.log

# Check for images
ls ~/.clawdbot/media/inbound/
```

## Troubleshooting

### Camera Init Failed

- Check pin configuration matches your ESP32-CAM board revision
- Verify OV2640 sensor is properly seated
- Try different FRAMESIZE (e.g., FRAMESIZE_VGA instead of UXGA)

### WiFi Won't Connect

- Confirm SSID and password are correct
- Check 2.4GHz band is available (not 5GHz-only router)
- Move ESP32-CAM closer to router
- Check router isn't blocking unknown devices

### Images Not Arriving

- Verify receiver is listening: `lsof -i :5555`
- Check firewall allows port 5555
- Ping ESP32-CAM: `ping 192.168.1.50`
- Check Serial Monitor for upload errors

### Analyzer Not Processing

```bash
# Check permissions on media directory
ls -la ~/.clawdbot/media/inbound/

# Verify Groq API key
echo $GROQ_API_KEY

# Check analyzer logs
tail -f ~/.clawdbot/overwatch/analyzer.log
```

## Advanced Configuration

### Change JPEG Quality

Lower quality = smaller file, faster upload:

```cpp
config.jpeg_quality = 12;  // 0-63, lower = better quality
```

### Change Capture Interval

In main loop:

```cpp
delay(10000);  // Capture every 10 seconds (default: 5)
```

### Motion Detection (On-Device)

Add to firmware to only send when motion detected:

```cpp
uint32_t frameCount = 0;
uint32_t lastMotionTime = 0;

void detectMotion() {
  camera_fb_t* fb = esp_camera_fb_get();
  // Compare with previous frame...
  esp_camera_fb_return(fb);
}
```

## Power Management

For 24/7 operation:

- Use **5V 2A power supply** (USB adapter)
- Add **capacitor** (100uF) across power pins for stability
- Consider adding **deep sleep** between captures to reduce power:

```cpp
void sleep() {
  esp_sleep_enable_timer_wakeup(5000000);  // 5 seconds
  esp_light_sleep_start();
}
```

## Next Steps

1. ✅ Firmware uploaded
2. ✅ WiFi connected
3. ✅ Receiver running
4. ✅ Analyzer processing images
5. 🎯 Integrate with Overwatch monitoring
6. 🎯 Add Telegram alerts

See **[overwatch-checkin.js](../scripts/overwatch-checkin.js)** for integration with check-in GIFs.

---

**Questions?** Check the main [README.md](../README.md) or open an issue.
