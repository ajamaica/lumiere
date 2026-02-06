// ESP32-CAM Async HTTP Server (More Reliable)
// Uses ESPAsyncWebServer for better stability

#include <Arduino.h>
#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "esp_camera.h"

// ==================== PIN DEFINITIONS ====================
// AI-Thinker ESP32-CAM
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#define LED_GPIO_NUM       4

// ==================== CONFIGURATION ====================
const char* WIFI_SSID = "SpectrumSetup-617D";
const char* WIFI_PASS = "smoothcurrent945";
const char* DEVICE_NAME = "ESP32-CAM";
const int SERVER_PORT = 80;

// ==================== GLOBALS ====================
AsyncWebServer server(SERVER_PORT);
bool cameraInitialized = false;
unsigned long lastPing = 0;

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

  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size = FRAMESIZE_SVGA;  // 800x600 - smaller, faster, more reliable
  config.jpeg_quality = 12;
  config.fb_count = 1;  // Single buffer to save memory

  // Power cycle the camera
  pinMode(PWDN_GPIO_NUM, OUTPUT);
  digitalWrite(PWDN_GPIO_NUM, HIGH);
  delay(100);
  digitalWrite(PWDN_GPIO_NUM, LOW);
  delay(100);

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed! Error 0x%x\n", err);
    return false;
  }

  sensor_t *s = esp_camera_sensor_get();
  if (s) {
    s->set_brightness(s, 0);
    s->set_contrast(s, 0);
    s->set_saturation(s, 0);
    s->set_whitebal(s, 1);
    s->set_exposure_ctrl(s, 1);
    s->set_gain_ctrl(s, 1);
  }

  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, LOW);

  Serial.println("Camera initialized!");
  return true;
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== ESP32-CAM Multi-Cam Node ===");
  
  // Try camera init with retries
  for (int i = 0; i < 3; i++) {
    cameraInitialized = initCamera();
    if (cameraInitialized) break;
    Serial.printf("Camera retry %d/3...\n", i + 1);
    delay(500);
  }

  if (!cameraInitialized) {
    Serial.println("Camera failed after retries - continuing anyway");
  }

  // WiFi with longer timeout
  Serial.printf("Connecting to %s...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(DEVICE_NAME);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) {
    delay(500);
    Serial.print(".");
    attempts++;
    if (attempts % 10 == 0) Serial.println();
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWiFi failed! Restarting...");
    delay(2000);
    ESP.restart();
  }

  Serial.printf("\nWiFi OK! IP: %s\n", WiFi.localIP().toString().c_str());

  // Web server routes
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request) {
    String html = "<h1>" + String(DEVICE_NAME) + "</h1>";
    html += "<p>Status: " + String(cameraInitialized ? "OK" : "NO CAM") + "</p>";
    html += "<p><a href='/capture'>Capture</a> | <a href='/status'>Status</a></p>";
    if (cameraInitialized) {
      html += "<img src='/capture' width='400'>";
    }
    request->send(200, "text/html", html);
  });

  server.on("/status", HTTP_GET, [](AsyncWebServerRequest *request) {
    String json = "{";
    json += "\"device\":\"" + String(DEVICE_NAME) + "\",";
    json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
    json += "\"camera\":" + String(cameraInitialized ? "true" : "false") + ",";
    json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
    json += "\"uptime\":" + String(millis() / 1000);
    json += "}";
    request->send(200, "application/json", json);
  });

  server.on("/capture", HTTP_GET, [](AsyncWebServerRequest *request) {
    if (!cameraInitialized) {
      request->send(503, "text/plain", "Camera not ready");
      return;
    }

    digitalWrite(LED_GPIO_NUM, HIGH);
    camera_fb_t *fb = esp_camera_fb_get();
    digitalWrite(LED_GPIO_NUM, LOW);

    if (!fb) {
      request->send(500, "text/plain", "Capture failed");
      return;
    }

    AsyncResponseStream *response = request->beginResponseStream("image/jpeg", fb->len);
    response->write(fb->buf, fb->len);
    esp_camera_fb_return(fb);
    request->send(response);
  });

  server.on("/ping", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "text/plain", "pong");
  });

  server.begin();
  Serial.println("HTTP server started!");
  Serial.printf("Test: curl http://%s/ping\n", WiFi.localIP().toString().c_str());
}

void loop() {
  // Keep-alive check
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Reconnecting...");
    WiFi.reconnect();
    delay(5000);
  }
  
  // Print heartbeat every 30 seconds
  if (millis() - lastPing > 30000) {
    Serial.printf("[OK] IP: %s RSSI: %d dBm\n", 
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    lastPing = millis();
  }
  
  delay(100);
}
