// ESP32-CAM HTTP Server - Stable Version
// Optimized for whole-house deployment

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "esp_camera.h"

// AI-Thinker ESP32-CAM Pinout
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

const char* WIFI_SSID = "SpectrumSetup-617D";
const char* WIFI_PASS = "smoothcurrent945";
const char* DEVICE_NAME = "ESP32-CAM";

WebServer server(80);
bool cameraReady = false;
unsigned long bootTime = 0;

bool initCamera() {
  // Power cycle camera
  pinMode(PWDN_GPIO_NUM, OUTPUT);
  digitalWrite(PWDN_GPIO_NUM, HIGH);
  delay(100);
  digitalWrite(PWDN_GPIO_NUM, LOW);
  delay(100);

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
  
  // Start with small frame - more reliable
  config.frame_size = FRAMESIZE_VGA;  // 640x480
  config.jpeg_quality = 10;
  config.fb_count = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", err);
    return false;
  }
  
  Serial.println("Camera OK!");
  return true;
}

void handleRoot() {
  String html = "<html><body>";
  html += "<h1>" + String(DEVICE_NAME) + "</h1>";
  html += "<p>Camera: " + String(cameraReady ? "READY" : "ERROR") + "</p>";
  html += "<p>IP: " + WiFi.localIP().toString() + "</p>";
  html += "<p><a href='/capture'>Take Photo</a></p>";
  html += "<p><a href='/status'>Status</a></p>";
  if (cameraReady) {
    html += "<img src='/capture' width='320'>";
  }
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handleStatus() {
  String json = "{";
  json += "\"device\":\"" + String(DEVICE_NAME) + "\",";
  json += "\"ip\":\"" + WiFi.localIP().toString() + "\",";
  json += "\"camera\":" + String(cameraReady ? "true" : "false") + ",";
  json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
  json += "\"uptime\":" + String((millis() - bootTime) / 1000);
  json += "}";
  server.send(200, "application/json", json);
}

void handleCapture() {
  if (!cameraReady) {
    server.send(503, "text/plain", "Camera not ready");
    return;
  }

  digitalWrite(LED_GPIO_NUM, LOW);  // LED on (active low)
  camera_fb_t *fb = esp_camera_fb_get();
  digitalWrite(LED_GPIO_NUM, HIGH); // LED off

  if (!fb) {
    server.send(500, "text/plain", "Capture failed");
    return;
  }

  server.sendHeader("Content-Type", "image/jpeg");
  server.sendHeader("Content-Length", String(fb->len));
  server.send(200, "image/jpeg", "");
  WiFiClient client = server.client();
  client.write(fb->buf, fb->len);
  
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  delay(1000);  // Wait for serial
  
  bootTime = millis();
  Serial.println("\n=== ESP32-CAM Boot ===");

  // Init LED
  pinMode(LED_GPIO_NUM, OUTPUT);
  digitalWrite(LED_GPIO_NUM, HIGH);

  // Try camera
  cameraReady = initCamera();
  
  // Connect WiFi
  Serial.printf("WiFi: %s\n", WIFI_SSID);
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
    Serial.println("\nWiFi FAIL");
    ESP.restart();
  }

  Serial.printf("\nWiFi OK - IP: %s\n", WiFi.localIP().toString().c_str());

  // Wait before starting server (stability)
  delay(2000);

  // Routes
  server.on("/", handleRoot);
  server.on("/status", handleStatus);
  server.on("/capture", handleCapture);
  
  server.begin();
  Serial.println("=== SERVER READY ===");
  Serial.printf("URL: http://%s/\n", WiFi.localIP().toString().c_str());
}

void loop() {
  server.handleClient();
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost - reconnecting...");
    WiFi.reconnect();
    delay(5000);
  }
  
  delay(1);
}
