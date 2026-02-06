// ClawdSense HTTP Camera - On-Demand Capture
// XIAO ESP32-S3 Sense with OV2640
// Exposes: GET /capture -> returns JPEG image

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// ==================== PIN DEFINITIONS ====================
// XIAO ESP32-S3 Sense Camera Pins
#define PWDN_GPIO_NUM    -1
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM    10
#define SIOD_GPIO_NUM    40
#define SIOC_GPIO_NUM    39
#define Y9_GPIO_NUM      48
#define Y8_GPIO_NUM      11
#define Y7_GPIO_NUM      12
#define Y6_GPIO_NUM      14
#define Y5_GPIO_NUM      16
#define Y4_GPIO_NUM      18
#define Y3_GPIO_NUM      17
#define Y2_GPIO_NUM      15
#define VSYNC_GPIO_NUM   38
#define HREF_GPIO_NUM    47
#define PCLK_GPIO_NUM    13

// ==================== CONFIGURATION ====================
// UPDATE THESE WITH YOUR WIFI CREDENTIALS
const char* WIFI_SSID = "SpectrumSetup-617D";
const char* WIFI_PASS = "smoothcurrent945";

// Device settings
const char* DEVICE_NAME = "ClawdSense";
const int SERVER_PORT = 80;

// ==================== GLOBALS ====================
WebServer server(SERVER_PORT);
bool cameraInitialized = false;

// ==================== CAMERA SETUP ====================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;

  // XCLK 10MHz - stable for OV2640 (20MHz causes probe failures)
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;

  // Frame buffer config - start with smaller size for reliability
  config.frame_size = FRAMESIZE_SXGA;  // 1280x1024 (UXGA can cause issues)
  config.jpeg_quality = 10;  // 0-63, lower is higher quality
  config.fb_count = 2;  // 2 frame buffers for smoother capture
  config.fb_location = CAMERA_FB_IN_PSRAM;
  config.grab_mode = CAMERA_GRAB_LATEST;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed! Error 0x%x\n", err);
    return false;
  }

  // Camera sensor settings
  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);      // -2 to 2
    s->set_contrast(s, 0);        // -2 to 2
    s->set_saturation(s, 0);      // -2 to 2
    s->set_special_effect(s, 0);  // 0 = no effect
    s->set_whitebal(s, 1);        // 1 = auto white balance
    s->set_awb_gain(s, 1);        // 1 = auto WB gain
    s->set_wb_mode(s, 0);         // 0 = auto
    s->set_exposure_ctrl(s, 1);   // 1 = auto exposure
    s->set_aec2(s, 0);            // 0 = disable AEC2
    s->set_ae_level(s, 0);        // -2 to 2
    s->set_gain_ctrl(s, 1);       // 1 = auto gain
    s->set_agc_gain(s, 0);        // 0 to 30
    s->set_gainceiling(s, (gainceiling_t)0);  // 0 to 6
    s->set_bpc(s, 0);             // 0 = disable black pixel correction
    s->set_wpc(s, 1);             // 1 = enable white pixel correction
    s->set_raw_gma(s, 1);         // 1 = enable raw gamma
    s->set_lenc(s, 1);            // 1 = enable lens correction
    s->set_hmirror(s, 0);         // 0 = disable horizontal mirror
    s->set_vflip(s, 0);           // 0 = disable vertical flip
    s->set_dcw(s, 1);             // 1 = enable downsize (DCW)
    s->set_colorbar(s, 0);        // 0 = disable color bar
  }

  // CRITICAL: Wait for camera/exposure to stabilize
  delay(2000);

  Serial.println("Camera initialized successfully");
  return true;
}

// ==================== HTTP HANDLERS ====================
void handleRoot() {
  String html = "<!DOCTYPE html><html>"
    "<head><title>" + String(DEVICE_NAME) + "</title></head>"
    "<body>"
    "<h1>" + String(DEVICE_NAME) + " Camera</h1>"
    "<p>Status: <b>Online</b></p>"
    "<p>Endpoints:</p>"
    "<ul>"
    "<li><a href='/capture'>/capture</a> - Take a photo (returns JPEG)</li>"
    "<li><a href='/status'>/status</a> - Device status (JSON)</li>"
    "</ul>"
    "<p><img src='/capture' width='640'></p>"
    "</body></html>";
  server.send(200, "text/html", html);
}

void handleCapture() {
  if (!cameraInitialized) {
    server.send(503, "application/json", "{\"error\":\"Camera not initialized\",\"status\":\"camera_failed\"}");
    return;
  }

  Serial.println("Capturing photo...");
  
  // Turn on LED (if available)
  // pinMode(LED_GPIO, OUTPUT);
  // digitalWrite(LED_GPIO, HIGH);
  
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed!");
    server.send(500, "text/plain", "Camera capture failed");
    return;
  }

  Serial.printf("Captured: %dx%d, %d bytes\n", fb->width, fb->height, fb->len);

  // Send the image
  server.sendHeader("Content-Type", "image/jpeg");
  server.sendHeader("Content-Length", String(fb->len));
  server.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  server.send(200, "image/jpeg", "");
  server.sendContent((const char*)fb->buf, fb->len);

  // Return frame buffer
  esp_camera_fb_return(fb);
  
  Serial.println("Photo sent successfully");
}

void handleStatus() {
  String json = "{";
  json += "\"device\":\"" + String(DEVICE_NAME) + "\",";
  json += "\"uptime\":" + String(millis() / 1000) + ",";
  json += "\"camera_ready\":" + String(cameraInitialized ? "true" : "false") + ",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"free_heap\":" + String(ESP.getFreeHeap());
  json += "}";
  
  server.sendHeader("Content-Type", "application/json");
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.send(404, "text/plain", "Not Found");
}

// ==================== SETUP & LOOP ====================
void setup() {
  // CRITICAL: Delay before Serial on ESP32-S3 Sense
  delay(2000);

  Serial.begin(115200);
  Serial.setDebugOutput(true);
  delay(100);  // Let serial settle
  Serial.println("\n\n=== ClawdSense HTTP Camera ===");
  
  // Initialize camera (non-critical - continue even if it fails)
  cameraInitialized = initCamera();
  if (!cameraInitialized) {
    Serial.println("WARNING: Camera init failed! Server will run without camera.");
    Serial.println("Check camera connection and reboot.");
    delay(2000);
    // Continue anyway so we can debug
  }

  // Connect to WiFi
  Serial.printf("Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_NAME);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi connection failed! Restarting...");
    delay(1000);
    ESP.restart();
  }

  Serial.println("\nWiFi connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Hostname: ");
  Serial.println(DEVICE_NAME);

  // Setup web server routes
  server.on("/", HTTP_GET, handleRoot);
  server.on("/capture", HTTP_GET, handleCapture);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);

  // Start server
  server.begin();
  Serial.printf("HTTP server started on port %d\n", SERVER_PORT);
  Serial.println("Ready! Visit http://" + WiFi.localIP().toString() + "/capture");
}

void loop() {
  server.handleClient();
  delay(1);  // Allow WiFi stack to process
}
